import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { getImagePreview } from "../api/appwrite";

const Block = ({
  block,
  onUpdate,
  onDelete,
  onPaste,
  uploadImage,
  syncStatus,
}) => {
  const [content, setContent] = useState(block.content || "");
  const [imageUrl, setImageUrl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const textareaRef = useRef(null);
  const lastSyncedContent = useRef(block.content);
  const isUserTyping = useRef(false);
  const typingTimeoutRef = useRef(null);

  // 同步状态指示器组件
  const SyncStatusIndicator = ({ status }) => {
    if (!status) return null;

    const getStatusIcon = () => {
      switch (status) {
        case "syncing":
          return (
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          );
        case "synced":
          return (
            <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-2 h-2 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          );
        case "error":
          return (
            <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <svg
                className="w-2 h-2 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          );
        default:
          return null;
      }
    };

    return <div className="absolute top-2 left-2 z-10">{getStatusIcon()}</div>;
  };

  const debouncedContent = useDebounce(content, 500);

  // 同步 block.content 变化到本地状态
  useEffect(() => {
    if (
      !isUserTyping.current && // 用户不在输入时才同步
      block.content !== lastSyncedContent.current &&
      block.content !== undefined &&
      block.content !== content // 避免不必要的同步
    ) {
      // 保存当前光标位置
      const textarea = textareaRef.current;
      const cursorPosition = textarea ? textarea.selectionStart : 0;

      setContent(block.content || "");
      lastSyncedContent.current = block.content;

      // 恢复光标位置
      if (textarea && cursorPosition !== undefined) {
        setTimeout(() => {
          textarea.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
      }
    }
  }, [block.content, block.$id, content]);

  // 自动保存文本内容
  useEffect(() => {
    if (
      !isDeleted && // 确保块未被删除
      block.type === "text" &&
      debouncedContent !== block.content &&
      !isUserTyping.current // 确保用户不在输入
    ) {
      // console.log(`自动保存块 ${block.$id}:`, {
      //   debouncedContent,
      //   blockContent: block.content,
      //   isUserTyping: isUserTyping.current,
      // });
      // 保存所有内容，包括空内容
      onUpdate(block.$id, { content: debouncedContent });
    }
  }, [
    debouncedContent,
    block.content,
    block.type,
    block.$id,
    onUpdate,
    isDeleted,
  ]);

  // 获取图片预览
  useEffect(() => {
    if (block.type === "image" && block.fileId) {
      try {
        const previewUrl = getImagePreview(block.fileId);
        setImageUrl(previewUrl);
      } catch (err) {
        console.error("获取图片预览失败:", err);
      }
    }
  }, [block.type, block.fileId]);

  // 确认删除
  const confirmDelete = useCallback(() => {
    setIsDeleted(true); // 标记为已删除，停止自动保存
    onDelete(block.$id, block.fileId);
    setShowDeleteConfirm(false);
  }, [onDelete, block.$id, block.fileId]);

  // 取消删除
  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    // 重新聚焦到 textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, []);

  // 复制功能 - 仅支持文本复制
  const handleCopy = useCallback(async () => {
    // 只处理文本块的复制
    if (block.type !== "text") {
      return;
    }

    try {
      // 复制文字内容
      await navigator.clipboard.writeText(content);

      // 显示复制成功提示
      setShowCopyToast(true);
      setTimeout(() => {
        setShowCopyToast(false);
      }, 2000);
    } catch (err) {
      console.error("复制失败:", err);
      // 如果现代API失败，尝试传统方法
      try {
        const textArea = document.createElement("textarea");
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);

        setShowCopyToast(true);
        setTimeout(() => {
          setShowCopyToast(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error("传统复制方法也失败:", fallbackErr);
      }
    }
  }, [block.type, content]);

  // 自动调整 textarea 高度
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      // 保存当前光标位置
      const cursorPosition = textareaRef.current.selectionStart;
      const scrollTop = textareaRef.current.scrollTop;

      // 重置高度为自动，让浏览器计算内容高度
      textareaRef.current.style.height = "auto";

      // 计算需要的高度，确保至少是最小高度
      const minHeight = 32; // 2rem = 32px
      const contentHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(contentHeight, minHeight);

      // 设置新高度
      textareaRef.current.style.height = newHeight + "px";

      // 恢复光标位置和滚动位置
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      textareaRef.current.scrollTop = scrollTop;
    }
  }, []);

  // 处理删除确认弹窗的键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showDeleteConfirm) {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmDelete();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelDelete();
        }
      }
    };

    if (showDeleteConfirm) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showDeleteConfirm, confirmDelete, cancelDelete]);

  // 处理键盘事件
  const handleKeyDown = (e) => {
    // Command+Backspace 或 Ctrl+Backspace 删除当前块
    if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") {
      const textarea = e.target;
      const hasSelection = textarea.selectionStart !== textarea.selectionEnd;

      // 如果有选中文本，让浏览器处理正常的删除选中文本行为
      if (hasSelection) {
        return;
      }

      // 只有在没有选中文本且内容为空时才删除整个块
      if (!content.trim()) {
        e.preventDefault();
        // 对于图片块，即使内容为空也要显示确认对话框
        if (block.type === "image") {
          handleDelete(e);
        } else {
          setIsDeleted(true); // 标记为已删除，停止自动保存
          onDelete(block.$id, block.fileId);
        }
      } else {
        e.preventDefault();
        handleDelete(e);
      }
    }
  };

  // 处理文本变化
  const handleTextChange = (e) => {
    const newValue = e.target.value;

    // 设置用户输入标记
    isUserTyping.current = true;

    // 清除之前的定时器
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setContent(newValue);

    // 设置新的定时器，在用户停止输入后重置标记
    typingTimeoutRef.current = setTimeout(() => {
      isUserTyping.current = false;
    }, 300); // 增加延迟时间，确保用户输入完成
  };

  // 处理删除
  const handleDelete = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // console.log(`点击删除按钮，块类型: ${block.type}, 块ID: ${block.$id}`);
    setShowDeleteConfirm(true);
  };

  // 调试：监听 showDeleteConfirm 变化
  useEffect(() => {
    if (showDeleteConfirm) {
      // console.log(
      //   `显示删除确认对话框，块类型: ${block.type}, 块ID: ${block.$id}`
      // );
    }
  }, [showDeleteConfirm, block.type, block.$id]);

  // 处理点击编辑
  const handleClick = () => {
    if (block.type === "text") {
      setIsEditing(true);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } else if (block.type === "image") {
      // 图片块也可以聚焦，用于接收键盘事件
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  // 处理失去焦点
  const handleBlur = (e) => {
    // 延迟检查，确保焦点没有转移到同一个块的其他元素
    setTimeout(() => {
      const activeElement = document.activeElement;

      // 如果焦点在删除确认弹窗上，不退出编辑模式
      if (activeElement && activeElement.closest(".fixed.inset-0")) {
        return;
      }

      // 安全地获取当前块
      let currentBlock = null;
      if (e.currentTarget) {
        currentBlock = e.currentTarget.closest("[data-block-order]");
      }

      // 如果无法获取当前块，尝试通过 block.$id 查找
      if (!currentBlock) {
        currentBlock = document.querySelector(
          `[data-block-order="${block.$id}"]`
        );
      }

      // 如果焦点不在当前块内的任何元素上，则退出编辑模式
      if (!currentBlock || !currentBlock.contains(activeElement)) {
        setIsEditing(false);
        // 确保在失去焦点时保存内容
        isUserTyping.current = false;

        // 立即触发一次保存，确保内容同步
        if (content !== block.content) {
          console.log(`失去焦点时保存块 ${block.$id}:`, {
            content,
            blockContent: block.content,
          });
          onUpdate(block.$id, { content });
        }
      }
    }, 100);
  };

  // 处理粘贴事件
  const handlePaste = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const items = e.clipboardData?.items;

    if (!items || items.length === 0) {
      // 如果没有剪贴板数据，回退到父组件的处理方式
      if (onPaste) {
        onPaste(e);
      }
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.includes("image")) {
        // 处理图片粘贴 - 在当前块中处理
        const file = item.getAsFile();
        if (file) {
          try {
            // 上传图片到 Appwrite Storage
            const uploadResult = await uploadImage(file);

            // 更新当前块为图片块
            await onUpdate(block.$id, {
              type: "image",
              fileId: uploadResult.$id,
              content: "", // 清空文本内容
            });
          } catch (err) {
            console.error("上传图片失败:", err);

            // 如果上传失败，将图片转换为 base64 存储
            const reader = new FileReader();
            reader.onload = async (e) => {
              const base64 = e.target.result;
              try {
                // 更新当前块，将 base64 图片存储在 content 中
                await onUpdate(block.$id, {
                  type: "text",
                  content: `![粘贴的图片](${base64})`,
                });
              } catch (updateErr) {
                console.error("更新块失败:", updateErr);
                // 如果更新也失败，将内容设置为文本
                setContent(`![粘贴的图片](${base64})`);
              }
            };
            reader.readAsDataURL(file);
          }
        }
      } else if (item.type.includes("text")) {
        // 处理文本粘贴
        item.getAsString((text) => {
          if (text.trim()) {
            // 设置用户输入标记，避免立即同步
            isUserTyping.current = true;
            setContent(text);

            // 延迟重置输入标记
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              isUserTyping.current = false;
            }, 300);
          }
        });
      }
    }
  };

  // 内容变化时自动调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (block.type === "image") {
    return (
      <div
        className="group relative mb-4 p-4 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors focus-within:border-blue-500 focus-within:bg-blue-900/20"
        data-block-order={block.$id}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        tabIndex={0}
        style={{ outline: "none" }}
      >
        <SyncStatusIndicator status={syncStatus} />
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="上传的图片"
                className="max-w-full h-auto rounded-lg shadow-sm"
                onError={() => setImageUrl(null)}
              />
            ) : (
              <div className="w-full h-32 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">加载图片中...</span>
              </div>
            )}
          </div>
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-red-500 transition-opacity"
            title="删除图片"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 图片块的隐藏输入区域，用于接收键盘事件 */}
        <div className="absolute inset-0 opacity-0 pointer-events-none">
          <textarea
            ref={textareaRef}
            value=""
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full h-full border-none outline-none resize-none bg-transparent"
            style={{ minHeight: "2rem" }}
            readOnly
          />
        </div>

        {/* 现代化删除确认弹窗 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-white mb-2">
                  删除确认
                </h3>
                <p className="text-sm text-gray-300 mb-6">
                  确定要删除这个块吗？此操作无法撤销。
                </p>
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    取消 (Esc)
                  </button>
                  <button
                    ref={(el) => {
                      if (el && showDeleteConfirm) {
                        setTimeout(() => el.focus(), 0);
                      }
                    }}
                    onClick={confirmDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  >
                    删除 (Enter)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative mb-4" data-block-order={block.$id}>
      <SyncStatusIndicator status={syncStatus} />
      <div
        className={`p-4 border rounded-lg transition-colors ${
          isEditing
            ? "border-blue-500 bg-blue-900/20"
            : "border-gray-700 hover:border-gray-600"
        }`}
        onClick={handleClick}
        onPaste={handlePaste}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder=""
          className="w-full min-h-[2rem] border-none outline-none resize-none bg-transparent text-white placeholder-gray-500"
          style={{ minHeight: "2rem" }}
        />
      </div>

      {/* 删除按钮 */}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 absolute -right-2 -top-2 p-1 bg-gray-800 border border-gray-600 rounded-full text-gray-400 hover:text-red-500 hover:border-red-500 transition-all"
        title="删除块"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* 复制按钮 - 仅对文本块显示 */}
      {block.type === "text" && (
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 absolute -right-2 -bottom-2 p-1 bg-gray-800 border border-gray-600 rounded-full text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all"
          title="复制内容"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      )}

      {/* 现代化删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-white mb-2">删除确认</h3>
              <p className="text-sm text-gray-300 mb-6">
                确定要删除这个块吗？此操作无法撤销。
              </p>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  取消 (Esc)
                </button>
                <button
                  ref={(el) => {
                    if (el && showDeleteConfirm) {
                      setTimeout(() => el.focus(), 0);
                    }
                  }}
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                >
                  删除 (Enter)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 复制成功提示 */}
      {showCopyToast && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg z-50 shadow-lg">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            已复制到剪贴板
          </div>
        </div>
      )}
    </div>
  );
};

export default Block;
