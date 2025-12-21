'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import './auth.css';

export default function AuthPage() {
  const [isActive, setIsActive] = useState(false);
  const router = useRouter();

  // ✅ Popup signup success
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);

  // ✅ Loading sign in overlay
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (signupTimerRef.current) window.clearTimeout(signupTimerRef.current);
    };
  }, []);

  const handleRegisterClick = () => setIsActive(true);
  const handleLoginClick = () => setIsActive(false);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email'),
      password_hash: formData.get('password'),
      first_name: formData.get('firstName'),
      last_name: formData.get('lastName'),
      phone: formData.get('phone'),
    };

    try {
      const response = await fetch('http://localhost:3001/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // ✅ show popup 2s then switch to sign-in
        setShowSignupSuccess(true);

        if (signupTimerRef.current) window.clearTimeout(signupTimerRef.current);
        signupTimerRef.current = window.setTimeout(() => {
          setShowSignupSuccess(false);
          setIsActive(false);
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Registration failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed: Network error');
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email'),
      password_hash: formData.get('password'),
    };

    setIsSigningIn(true);

    try {
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();

        localStorage.setItem('access_token', result.data?.access_token);
        localStorage.setItem('sessionId', result.data?.sessionId);

        // ✅ keep loading until navigate
        router.push('/home');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Sign in failed: ${errorData.message || 'Invalid credentials'}`);
        setIsSigningIn(false);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed: Network error');
      setIsSigningIn(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* ✅ Popup: Sign Up Successfully */}
      {showSignupSuccess && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <div className="auth-modal-title">Sign Up Successfully</div>
            <div className="auth-modal-sub">Redirecting to Sign In...</div>
          </div>
        </div>
      )}

      {/* ✅ Loading overlay: Signing in */}
      {isSigningIn && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <div className="auth-spinner" />
            <div className="auth-modal-title">Signing In...</div>
            <div className="auth-modal-sub">Please wait a moment</div>
          </div>
        </div>
      )}

      <div className={`auth-container ${isActive ? 'active' : ''}`}>
        <div className="form-container sign-up">
          <form onSubmit={handleSignUp}>
            <h1>Create Account</h1>

            <div className="social-icons">
              <a href="#" className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
              <a href="#" className="icon"><i className="fa-brands fa-facebook-f"></i></a>
              <a href="#" className="icon"><i className="fa-brands fa-github"></i></a>
              <a href="#" className="icon"><i className="fa-brands fa-linkedin-in"></i></a>
            </div>

            <span>or use your email for registration</span>
            <input type="text" placeholder="First Name" name="firstName" required />
            <input type="text" placeholder="Last Name" name="lastName" required />
            <input type="email" placeholder="Email" name="email" required />
            <input type="text" placeholder="Phone" name="phone" required />
            <input type="password" placeholder="Password" name="password" required />

            <button type="submit" disabled={showSignupSuccess || isSigningIn}>
              Sign Up
            </button>
          </form>
        </div>

        <div className="form-container sign-in">
          <form onSubmit={handleSignIn}>
            <h1>Sign In</h1>

            <div className="social-icons">
              <a href="#" className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
              <a href="#" className="icon"><i className="fa-brands fa-facebook-f"></i></a>
              <a href="#" className="icon"><i className="fa-brands fa-github"></i></a>
              <a href="#" className="icon"><i className="fa-brands fa-linkedin-in"></i></a>
            </div>

            <span>or use your email password</span>
            <input type="email" placeholder="Email" name="email" required />
            <input type="password" placeholder="Password" name="password" required />
            <a href="#">Forget Your Password?</a>

            <button type="submit" disabled={isSigningIn || showSignupSuccess}>
              {isSigningIn ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="toggle-container">
          <div className="toggle">
            <video
              className="toggle-video"
              src="/login.mp4"
              autoPlay
              loop
              muted
              playsInline
            />

            <div className="toggle-panel toggle-left">
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button className="ghost" onClick={handleLoginClick} type="button">
                Sign In
              </button>
            </div>

            <div className="toggle-panel toggle-right">
              <h1>Hello, Friend!</h1>
              <p>Register with your personal details to use all of site features</p>
              <button className="ghost" onClick={handleRegisterClick} type="button">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
