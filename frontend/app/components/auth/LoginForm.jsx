'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowLeft, LogIn, Eye, EyeOff } from 'lucide-react';
import { Logo } from './Logo';
import styles from './auth.module.css';

export function LoginForm({ onBack, onSwitchToSignup, onSubmit }) {
	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();
		if (onSubmit) {
			onSubmit({ email, password });
		}
	};

	return (
		<Card className={styles.card}>
			<CardHeader>
				<Button
					variant="ghost"
					className={styles.backButton}
					onClick={onBack}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Назад
				</Button>
				<div className={styles.headerContent}>
					<div className={`${styles.logoContainer} ${styles.logoContainerSmall}`}>
						<Logo className={styles.logoImage} variant="purple" />
					</div>
					<CardTitle className={styles.titleGradientPurple}>
						Вход в аккаунт
					</CardTitle>
				</div>
				<CardDescription className={styles.textDark}>
					Введите свои данные для входа
				</CardDescription>
			</CardHeader>
			
			<form onSubmit={handleSubmit}>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email" className={styles.label}>Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="example@mail.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className={styles.input}
						/>
					</div>
					
					<div className="space-y-2">
						<Label htmlFor="password" className={styles.label}>Пароль</Label>
						<div className="relative">
							<Input
								id="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className={`${styles.input} ${styles.inputPassword}`}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className={styles.passwordToggle}
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<label className="flex items-center space-x-2 cursor-pointer">
							<input type="checkbox" className={styles.checkbox} />
							<span className={`text-sm ${styles.checkboxLabel}`}>Запомнить меня</span>
						</label>
						<button type="button" className={`text-sm ${styles.link}`}>
							Забыли пароль?
						</button>
					</div>

					<Button
						type="submit"
						className={styles.buttonGradient}
						size="lg"
					>
						<LogIn className="mr-2 h-5 w-5" />
						Войти
					</Button>
				</CardContent>

				<CardFooter className="flex-col space-y-2 pt-6">
					<p className={`text-sm ${styles.footerText}`}>
						Нет аккаунта?{' '}
						<button
							type="button"
							onClick={onSwitchToSignup}
							className={styles.link}
						>
							Зарегистрироваться
						</button>
					</p>
				</CardFooter>
			</form>
		</Card>
	);
}


