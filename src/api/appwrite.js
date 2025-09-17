import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

// Appwrite 配置 - 请根据您的 Appwrite 项目配置修改这些值
const APPWRITE_ENDPOINT =
  import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  import.meta.env.VITE_APPWRITE_PROJECT_ID || "your-project-id";
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID || "primary_db";
const COLLECTION_ID = import.meta.env.VITE_COLLECTION_ID || "blocks";
const BUCKET_ID = import.meta.env.VITE_BUCKET_ID || "images";

// 初始化 Appwrite 客户端
const client = new Client();
client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

// 导出服务实例
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// 认证相关函数
export const login = async (email, password) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (error) {
    throw new Error(`登录失败: ${error.message}`);
  }
};

export const register = async (email, password, name) => {
  try {
    const user = await account.create(ID.unique(), email, password, name);
    return user;
  } catch (error) {
    throw new Error(`注册失败: ${error.message}`);
  }
};

export const logout = async () => {
  try {
    await account.deleteSession("current");
  } catch (error) {
    throw new Error(`登出失败: ${error.message}`);
  }
};

export const getCurrentUser = async () => {
  try {
    const user = await account.get();
    return user;
  } catch {
    return null; // 用户未登录
  }
};

// 数据库相关函数
export const getBlocks = async (userId) => {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("userId", userId),
      Query.orderAsc("$createdAt"),
    ]);
    return response.documents;
  } catch (error) {
    throw new Error(`获取数据失败: ${error.message}`);
  }
};

export const createBlock = async (data) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      data
    );
    return response;
  } catch (error) {
    throw new Error(`创建块失败: ${error.message}`);
  }
};

export const updateBlock = async (blockId, data) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      blockId,
      data
    );
    return response;
  } catch (error) {
    throw new Error(`更新块失败: ${error.message}`);
  }
};

export const deleteBlock = async (blockId) => {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, blockId);
  } catch (error) {
    throw new Error(`删除块失败: ${error.message}`);
  }
};

// 存储相关函数
export const uploadImage = async (file) => {
  try {
    const response = await storage.createFile(BUCKET_ID, ID.unique(), file);
    return response;
  } catch (error) {
    throw new Error(`上传图片失败: ${error.message}`);
  }
};

export const getImagePreview = (fileId) => {
  try {
    return storage.getFilePreview(BUCKET_ID, fileId);
  } catch (error) {
    throw new Error(`获取图片预览失败: ${error.message}`);
  }
};

export const deleteImage = async (fileId) => {
  try {
    await storage.deleteFile(BUCKET_ID, fileId);
  } catch (error) {
    throw new Error(`删除图片失败: ${error.message}`);
  }
};

// 测试数据库连接
export const testConnection = async () => {
  try {
    // 尝试列出数据库中的文档来测试连接
    await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [Query.limit(1)]);
    return { success: true, message: "数据库连接正常" };
  } catch (error) {
    console.error("数据库连接测试失败:", error);

    // 提供更详细的错误信息
    let errorMessage = error.message;
    if (error.code === 401) {
      errorMessage = "认证失败，请检查 API 密钥";
    } else if (error.code === 404) {
      errorMessage = "数据库或集合不存在，请检查配置";
    } else if (error.code === 403) {
      errorMessage = "权限不足，请检查数据库权限设置";
    } else if (error.message.includes("network")) {
      errorMessage = "网络连接失败，请检查网络设置";
    }

    return { success: false, message: errorMessage };
  }
};
