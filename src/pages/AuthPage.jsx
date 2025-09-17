import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import AuthForm from "../components/AuthForm";

const AuthPage = () => {
  const { login, register, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (formData) => {
    if (isLogin) {
      return await login(formData.email, formData.password);
    } else {
      return await register(formData.email, formData.password, formData.name);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Web Inbox</h1>
          <p className="text-gray-600">临时存放和同步一些文字和图片</p>
        </div>

        <AuthForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          isLogin={isLogin}
        />

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            disabled={isLoading}
          >
            {isLogin ? "还没有账号？点击注册" : "已有账号？点击登录"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
