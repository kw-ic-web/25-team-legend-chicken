import React, { useState } from 'react';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'student' as 'student' | 'professor'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 회원가입 로직 구현
    console.log('회원가입 시도:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="register-page">
      <h1>회원가입</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">이름</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">비밀번호 확인</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="userType">사용자 유형</label>
          <select
            id="userType"
            name="userType"
            value={formData.userType}
            onChange={handleChange}
            required
          >
            <option value="student">학생</option>
            <option value="professor">교수(강사)</option>
          </select>
        </div>
        <button type="submit">회원가입</button>
      </form>
      <p>
        이미 계정이 있으신가요? <a href="/login">로그인</a>
      </p>
    </div>
  );
};

export default RegisterPage;

