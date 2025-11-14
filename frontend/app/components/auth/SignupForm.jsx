'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowLeft, UserPlus, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Logo } from './Logo';
import styles from './auth.module.css';

export function SignupForm({ onBack, onSwitchToLogin, onSubmit }) {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		if (formData.password !== formData.confirmPassword) {
			alert('Пароли не совпадают');
		 return;
		}
		if (onSubmit) {
			onSubmit(formData);
		}
	};

	const handleChange = (field, value) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

	return (
		<Card className={styles.card}>
			<CardHeader>
				<Button
					variant="ghost"
					className={`${styles.backButton} ${styles.backButtonSignup}`}
					onClick={onBack}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Назад
				</Button>
				<div className={styles.headerContent}>
					<div className={`${styles.logoContainer} ${styles.logoContainerSmall}`}>
						<Logo className={styles.logoImage} variant="lime" />
					</div>
					<CardTitle className={styles.titleGradientSignup}>
						Регистрация
					</CardTitle>
				</div>
				<CardDescription className={styles.textDark}>
					Создайте новый аккаунт
				</CardDescription>
			</CardHeader>
			
			<form onSubmit={handleSubmit}>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name" className={styles.label}>Имя</Label>
						<Input
							id="name"
							type="text"
							placeholder="Иван Иванов"
							value={formData.name}
							onChange={(e) => handleChange('name', e.target.value)}
							required
							className={`${styles.input} ${styles.inputSignup}`}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="signup-email" className={styles.label}>Email</Label>
						<Input
							id="signup-email"
							type="email"
							placeholder="example@mail.com"
							value={formData.email}
							onChange={(e) => handleChange('email', e.target.value)}
							required
							className={`${styles.input} ${styles.inputSignup}`}
						/>
					</div>
					
					<div className="space-y-2">
						<Label htmlFor="signup-password" className={styles.label}>Пароль</Label>
						<div className="relative">
							<Input
								id="signup-password"
								type={showPassword ? 'text' : 'password'}
								placeholder="••••••••"
								value={formData.password}
								onChange={(e) => handleChange('password', e.target.value)}
								required
								className={`${styles.input} ${styles.inputSignup} ${styles.inputPassword}`}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className={`${styles.passwordToggle} ${styles.passwordToggleSignup}`}
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirm-password" className={styles.label}>Подтвердите пароль</Label>
						<div className="relative">
							<Input
								id="confirm-password"
								type={showConfirmPassword ? 'text' : 'password'}
								placeholder="••••••••"
								value={formData.confirmPassword}
								onChange={(e) => handleChange('confirmPassword', e.target.value)}
								required
								className={`${styles.input} ${styles.inputSignup} ${styles.inputPassword} ${formData.confirmPassword && (passwordsMatch ? styles.inputValid : styles.inputInvalid)}`}
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className={`${styles.passwordToggle} ${styles.passwordToggleSignup}`}
							>
								{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
							{passwordsMatch && (
								<CheckCircle2 className={styles.checkIcon} />
							)}
						</div>
						{formData.confirmPassword && !passwordsMatch && (
							<p className={styles.errorMessage}>Пароли не совпадают</p>
						)}
					</div>

					<div className="flex items-start space-x-2">
						<input type="checkbox" required className={`mt-1 ${styles.checkboxSignup}`} />
						<label className={`text-sm ${styles.checkboxLabel}`}>
							Я согласен с{' '}
							<button type="button" className={styles.linkSecondary}>
								условиями использования
							</button>
							{' '}и{' '}
							<button type="button" className={styles.linkSecondary}>
								политикой конфиденциальности
							</button>
						</label>
					</div>

					<Button
						type="submit"
						className={styles.buttonGradientSignup}
						size="lg"
					>
						<UserPlus className="mr-2 h-5 w-5" />
						Зарегистрироваться
					</Button>
				</CardContent>

				<CardFooter className="flex-col space-y-2 pt-6">
					<p className={`text-sm ${styles.footerText}`}>
						Уже есть аккаунт?{' '}
						<button
							type="button"
							onClick={onSwitchToLogin}
							className={styles.linkSecondary}
						>
							Войти
						</button>
					</p>
				</CardFooter>
			</form>
		</Card>
	);
}


