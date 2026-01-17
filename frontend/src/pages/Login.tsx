import { useEffect, useState } from "react";
import apiClient from "../api/axiosConfig";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [telegramId, setTelegramId] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (user) {
			navigate("/");
		}
	}, [user, navigate]);



	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const response = await apiClient.post("/auth/login", {
				telegramId: Number(telegramId),
				password,
			});

			if (response.data?.success && response.data?.user) {
				localStorage.setItem("user", JSON.stringify(response.data.user));
				window.location.href = "/";
			} else {
				setError("Invalid credentials");
			}
		} catch (error: any) {
			const errorData = error.response?.data;
			if (errorData?.needsPassword) {
				// User exists but has no password - redirect to set password
				window.location.href = `/set-password?telegramId=${telegramId}`;
			} else {
				setError(errorData?.error || "Login failed");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="login-container">
			<div className="login-panel">
				<div className="login-header">
					<p className="login-subtitle">Вход в систему</p>
				</div>

				<form onSubmit={handleLogin} className="login-form">
					<div className="login-input-group">
						<label htmlFor="telegramId">Telegram ID</label>
						<input
							id="telegramId"
							type="text"
							value={telegramId}
							onChange={(e) => setTelegramId(e.target.value)}
							placeholder="Введите ваш Telegram ID"
							required
							autoComplete="username"
						/>
						<p className="login-hint">
							Узнайте свой ID через бота: <code>/id</code>
						</p>
					</div>

					<div className="login-input-group">
						<label htmlFor="password">Пароль</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Введите пароль"
							required
							autoComplete="current-password"
						/>
					</div>

					{error && <div className="login-error">{error}</div>}

					<button type="submit" className="login-button" disabled={loading}>
						{loading ? "Вход..." : "Войти"}
					</button>
				</form>

				<div className="login-links">
					<Link to="/register" className="login-link">
						Регистрация
					</Link>
					<Link to="/forgot-password" className="login-link">
						Забыли пароль?
					</Link>
				</div>
			</div>
		</div>
	);
};

export default Login;
