import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
  uploadImage,
  deleteImage,
  testConnection,
} from "../api/appwrite";
import Block from "./Block";
import Loader from "./Loader";

const Inbox = () => {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState(new Map()); // 同步状态：syncing, synced, error
  const containerRef = useRef(null);
  const updateQueueRef = useRef(new Map()); // 更新队列，避免重复更新
  const updateTimeoutRef = useRef(null); // 更新定时器
  const deletingBlocksRef = useRef(new Set()); // 正在删除的块集合

  // 获取所有块 (showLoading: 是否显示加载状态，默认为true)
  const fetchBlocks = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const data = await getBlocks(user.$id);
      setBlocks(data);
      setError("");
    } catch (err) {
      setError("获取数据失败: " + err.message);
      console.error("获取块失败:", err);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // 创建新块
  const handleCreateNewBlock = useCallback(
    async (afterOrder) => {
      try {
        const newBlock = await createBlock({
          type: "text",
          content: "",
          userId: user.$id,
        });

        // 更新本地状态：将新块添加到末尾（因为按创建时间排序）
        setBlocks((prevBlocks) => {
          const updatedBlocks = [...prevBlocks];

          // 如果指定了 afterOrder，找到插入位置
          if (afterOrder !== -1) {
            const insertIndex = updatedBlocks.findIndex(
              (block) => block.$createdAt > newBlock.$createdAt
            );
            if (insertIndex === -1) {
              updatedBlocks.push(newBlock);
            } else {
              updatedBlocks.splice(insertIndex, 0, newBlock);
            }
          } else {
            // 如果没有指定位置，添加到末尾
            updatedBlocks.push(newBlock);
          }

          return updatedBlocks;
        });

        // 聚焦到新创建的块
        setTimeout(() => {
          const newBlockElement = document.querySelector(
            `[data-block-order="${newBlock.$id}"] textarea`
          );
          if (newBlockElement) {
            newBlockElement.focus();
          }
        }, 100);
      } catch (err) {
        console.error("创建新块失败:", err);
        setError("创建新块失败: " + err.message);
      }
    },
    [user.$id]
  );

  // 组件挂载时获取数据
  useEffect(() => {
    if (user) {
      // 先测试数据库连接
      testConnection().then((result) => {
        if (result.success) {
          fetchBlocks();
        } else {
          console.error("数据库连接失败:", result.message);
          setError("数据库连接失败: " + result.message);
        }
      });
    }
  }, [user]);

  // 页面可见时静默刷新数据，确保数据是最新的
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        // 静默刷新，不显示加载状态
        fetchBlocks(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  // 批量更新函数
  const processUpdateQueue = useCallback(async () => {
    if (updateQueueRef.current.size === 0) return;

    const updates = Array.from(updateQueueRef.current.entries());
    updateQueueRef.current.clear();

    for (const [blockId, data] of updates) {
      try {
        // console.log(`处理更新队列 ${blockId}:`, data);
        await updateBlock(blockId, data);
        // console.log(`更新成功 ${blockId}`);

        // 设置同步状态为 synced
        setSyncStatus((prev) => new Map(prev.set(blockId, "synced")));

        // 3秒后清除同步状态
        setTimeout(() => {
          setSyncStatus((prev) => {
            const newMap = new Map(prev);
            newMap.delete(blockId);
            return newMap;
          });
        }, 1000);

        setBlocks((prev) => {
          const updatedBlocks = prev.map((block) =>
            block.$id === blockId ? { ...block, ...data } : block
          );
          return updatedBlocks;
        });

        // 更新成功后等待一段时间再处理下一个
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        console.error("更新块失败:", err);

        // 设置同步状态为 error
        setSyncStatus((prev) => new Map(prev.set(blockId, "error")));

        if (err.message.includes("Rate limit")) {
          // 如果遇到速率限制，将更新重新加入队列
          updateQueueRef.current.set(blockId, data);
          setError("保存速度过快，正在等待重试...");

          // 等待更长时间再重试
          setTimeout(() => {
            processUpdateQueue();
          }, 5000);
          return;
        } else if (err.message.includes("could not be found")) {
          // 如果块不存在，从队列中移除
          console.log(`块 ${blockId} 不存在，从更新队列中移除`);
          // 不需要额外操作，因为队列已经清空了
        } else {
          setError("更新块失败: " + err.message);
        }
      }
    }
  }, [setBlocks, setError]);

  // 确保容器能够接收键盘事件
  useEffect(() => {
    if (!isLoading && containerRef.current) {
      // 确保容器可以获得焦点
      containerRef.current.focus();
    }
  }, [isLoading]);

  // 页面刷新前保存数据
  useEffect(() => {
    const currentUpdateQueue = updateQueueRef.current;
    const currentTimeout = updateTimeoutRef.current;

    const handleBeforeUnload = (e) => {
      if (currentUpdateQueue.size > 0) {
        // 同步处理更新，避免数据丢失
        processUpdateQueue();
        e.preventDefault();
        e.returnValue = "正在保存数据，请稍候...";
        return "正在保存数据，请稍候...";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      // 组件卸载时立即处理剩余的更新，避免数据丢失
      if (currentUpdateQueue.size > 0) {
        processUpdateQueue();
      }
    };
  }, [processUpdateQueue]);

  // 处理容器点击事件，确保获得焦点
  const handleContainerClick = (e) => {
    // 如果点击的是容器本身（不是子元素），则获得焦点
    if (e.target === containerRef.current) {
      containerRef.current.focus();
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    // Command+Enter 或 Ctrl+Enter 创建新块
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();

      // 找到当前聚焦的块
      const focusedElement = document.activeElement;
      const blockElement = focusedElement.closest("[data-block-order]");

      if (blockElement) {
        const blockId = blockElement.getAttribute("data-block-order");
        const currentBlock = blocks.find((block) => block.$id === blockId);
        handleCreateNewBlock(currentBlock ? currentBlock.$createdAt : -1);
      } else {
        // 如果没有聚焦的块，在最下方创建新块
        handleCreateNewBlock(-1);
      }
    }
  };

  // 初始化时创建第一个块
  useEffect(() => {
    if (!isLoading && blocks.length === 0 && user) {
      handleCreateNewBlock(-1);
    }
  }, [isLoading, blocks.length, user, handleCreateNewBlock]);

  // 处理粘贴事件
  const handlePaste = async (e) => {
    e.preventDefault();

    const items = e.clipboardData?.items;

    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.includes("image")) {
        // 处理图片粘贴
        const file = item.getAsFile();
        if (file) {
          try {
            // 上传图片到 Appwrite Storage
            const uploadResult = await uploadImage(file);

            // 创建新的图片块
            const newBlock = await createBlock({
              type: "image",
              fileId: uploadResult.$id,
              userId: user.$id,
            });

            // 更新本地状态
            setBlocks((prev) => [...prev, newBlock]);
          } catch (err) {
            console.error("上传图片失败:", err);
            setError("上传图片失败: " + err.message);
          }
        }
      } else if (item.type.includes("text")) {
        // 处理文本粘贴
        item.getAsString((text) => {
          if (text.trim()) {
            createBlock({
              type: "text",
              content: text,
              userId: user.$id,
            })
              .then((newBlock) => {
                setBlocks((prev) => [...prev, newBlock]);
              })
              .catch((err) => {
                console.error("创建文本块失败:", err);
                setError("创建文本块失败: " + err.message);
              });
          }
        });
      }
    }
  };

  // 更新块（带智能速率控制）
  const handleUpdateBlock = async (blockId, data) => {
    // console.log(`收到更新请求 ${blockId}:`, data);

    // 合并更新数据
    const existingData = updateQueueRef.current.get(blockId) || {};
    const mergedData = { ...existingData, ...data };
    updateQueueRef.current.set(blockId, mergedData);

    // 立即更新本地状态，提供即时反馈
    setBlocks((prev) => {
      const updatedBlocks = prev.map((block) =>
        block.$id === blockId ? { ...block, ...mergedData } : block
      );
      return updatedBlocks;
    });

    // 清除之前的定时器
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // 设置新的定时器，延迟执行批量更新
    updateTimeoutRef.current = setTimeout(() => {
      // 在开始处理更新队列时才设置 syncing 状态
      setSyncStatus((prev) => new Map(prev.set(blockId, "syncing")));
      processUpdateQueue();
    }, 500); // 500ms后开始同步，显示同步状态
  };

  // 删除块
  const handleDeleteBlock = async (blockId, fileId) => {
    try {
      // console.log(`开始删除块 ${blockId}, fileId: ${fileId}`);

      // 检查是否已经在删除中
      if (deletingBlocksRef.current.has(blockId)) {
        console.log(`块 ${blockId} 正在删除中，跳过重复删除`);
        return;
      }

      // 标记为正在删除
      deletingBlocksRef.current.add(blockId);

      // 找到要删除的块，获取其索引
      const deletedIndex = blocks.findIndex((block) => block.$id === blockId);
      // console.log(`找到块索引: ${deletedIndex}`);

      // 立即从更新队列中移除该块的所有待处理更新
      updateQueueRef.current.delete(blockId);

      // 删除数据库记录
      // console.log(`删除数据库记录 ${blockId}`);
      await deleteBlock(blockId);
      // console.log(`数据库记录删除成功 ${blockId}`);

      // 如果是图片块，同时删除存储中的文件
      if (fileId) {
        await deleteImage(fileId);
      }

      // 更新本地状态
      setBlocks((prev) => {
        const newBlocks = prev.filter((block) => block.$id !== blockId);

        // 删除后自动聚焦到下一个块
        setTimeout(() => {
          if (deletedIndex !== -1) {
            // 找到下一个块（相同索引位置）
            const nextBlock = newBlocks[deletedIndex];
            if (nextBlock) {
              // 聚焦到下一个块
              const nextBlockElement = document.querySelector(
                `[data-block-order="${nextBlock.$id}"] textarea`
              );
              if (nextBlockElement) {
                nextBlockElement.focus();
              }
            } else if (newBlocks.length > 0) {
              // 如果没有下一个块，聚焦到最后一个块
              const lastBlock = newBlocks[newBlocks.length - 1];
              const lastBlockElement = document.querySelector(
                `[data-block-order="${lastBlock.$id}"] textarea`
              );
              if (lastBlockElement) {
                lastBlockElement.focus();
              }
            }
          }
        }, 100);

        return newBlocks;
      });

      // 删除完成，从正在删除集合中移除
      deletingBlocksRef.current.delete(blockId);
      // console.log(`块 ${blockId} 删除完成`);
    } catch (err) {
      console.error("删除块失败:", err);
      setError("删除块失败: " + err.message);

      // 删除失败，从正在删除集合中移除
      deletingBlocksRef.current.delete(blockId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader text="加载笔记中..." />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onClick={handleContainerClick}
        tabIndex={0}
        style={{ outline: "none" }}
      >
        <div className="w-full px-6 py-4">
          {blocks.map((block, index) => (
            <Block
              key={block.$id}
              block={block}
              onUpdate={handleUpdateBlock}
              onDelete={handleDeleteBlock}
              onPaste={handlePaste}
              uploadImage={uploadImage}
              isLast={index === blocks.length - 1}
              syncStatus={syncStatus.get(block.$id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
