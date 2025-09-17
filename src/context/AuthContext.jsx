import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, login, register, logout } from "../api/appwrite";

// 创建认证上下文
const AuthContext = createContext();

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 检查用户是否已登录
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("检查用户状态失败:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  // 登录函数
  const handleLogin = async (email, password) => {
    try {
      setIsLoading(true);
      await login(email, password);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return { success: true };
    } catch (error) {
      console.error("登录失败:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // 注册函数
  const handleRegister = async (email, password, name) => {
    try {
      setIsLoading(true);
      await register(email, password, name);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return { success: true };
    } catch (error) {
      console.error("注册失败:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // 登出函数
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      setUser(null);
    } catch (error) {
      console.error("登出失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 使用认证上下文的 Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 内部使用");
  }
  return context;
};
