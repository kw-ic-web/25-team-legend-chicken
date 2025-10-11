import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 첫 번째 단계로 리다이렉트
    navigate("/register/step1", { replace: true });
  }, [navigate]);

  return null;
};

export default RegisterPage;
