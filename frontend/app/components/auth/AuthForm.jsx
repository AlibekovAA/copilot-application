'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Logo } from './Logo';
import { ArrowLeft, LogIn, UserPlus, Eye, EyeOff, CheckCircle2, Send } from '../copilot/icons';
import { useToast } from '../ui/toast';
import { validateEmail, validateName, validatePassword, validatePasswordMatch } from '../../utils/validation';
import styles from './auth.module.css';

export function AuthForm({ mode = 'welcome', onBack, onSwitchMode, onSubmit, onForgotPassword, isLoading }) {
	const toast = useToast();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
	const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		if (mode === 'signup') {
			const nameValidation = validateName(formData.name);
			if (!nameValidation.valid) {
				toast.error(nameValidation.error);
				return;
			}

			const emailValidation = validateEmail(formData.email);
			if (!emailValidation.valid) {
				toast.error(emailValidation.error);
				return;
			}

			const passwordValidation = validatePassword(formData.password);
			if (!passwordValidation.valid) {
				toast.error(passwordValidation.error);
				return;
			}

			const passwordMatchValidation = validatePasswordMatch(
				formData.password,
				formData.confirmPassword,
			);
			if (!passwordMatchValidation.valid) {
				toast.error(passwordMatchValidation.error);
				return;
			}
		}

		if (mode === 'login') {
			const emailValidation = validateEmail(formData.email);
			if (!emailValidation.valid) {
				toast.error(emailValidation.error);
				return;
			}

			const passwordValidation = validatePassword(formData.password);
			if (!passwordValidation.valid) {
				toast.error(passwordValidation.error);
				return;
			}
		}
		if (mode === 'forgot-password') {
			const emailValidation = validateEmail(forgotPasswordEmail);
			if (!emailValidation.valid) {
				toast.error(emailValidation.error);
				return;
			}
			if (onForgotPassword) {
				onForgotPassword(forgotPasswordEmail);
				setForgotPasswordSent(true);
			}
			return;
		}
		if (onSubmit) {
			if (mode === 'login') {
				onSubmit({ email: formData.email, password: formData.password });
			} else {
				onSubmit(formData);
			}
		}
	};

	const handleChange = (field, value) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

	if (mode === 'welcome') {
		return (
			<Card className={styles.card}>
				<CardHeader className={styles.textCenter}>
					<div className={`${styles.logoContainer} ${styles.logoContainerLarge}`}>
						<Logo className={styles.logoImage} />
					</div>
					<CardTitle className={styles.titleGradient}>
						Добро пожаловать!
					</CardTitle>
				</CardHeader>
				<CardContent className={`${styles.flexCol} ${styles.spaceY3}`}>
					<Button
						onClick={() => onSwitchMode && onSwitchMode('login')}
						className={styles.buttonPrimary}
						size="lg"
					>
						<LogIn className={`${styles.icon} ${styles.iconMargin}`} />
						Войти
					</Button>
					<Button
						onClick={() => onSwitchMode && onSwitchMode('signup')}
						variant="outline"
						className={styles.buttonSecondary}
						size="lg"
					>
						<UserPlus className={`${styles.icon} ${styles.iconMargin}`} />
						Регистрация
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (mode === 'login') {
		return (
			<Card className={styles.card}>
				<CardHeader>
					<Button
						variant="ghost"
						className={styles.backButton}
						onClick={onBack}
					>
						<ArrowLeft className={`${styles.iconSmall} ${styles.iconMargin}`} />
						Назад
					</Button>
					<div className={styles.headerContent}>
						<div className={`${styles.logoContainer} ${styles.logoContainerSmall}`}>
							<Logo className={styles.logoImage} />
						</div>
					<CardTitle className={styles.titleGradient}>
						Вход в аккаунт
					</CardTitle>
					</div>
				</CardHeader>

				<form onSubmit={handleSubmit} noValidate>
					<CardContent className={styles.spaceY4}>
						<div className={styles.spaceY2}>
							<Label htmlFor="email" className={styles.label}>Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="example@mail.com"
								value={formData.email}
								onChange={(e) => handleChange('email', e.target.value)}
								required
								className={styles.input}
							/>
						</div>

						<div className={styles.spaceY2}>
							<Label htmlFor="password" className={styles.label}>Пароль</Label>
							<div className={styles.relative}>
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									placeholder="••••••••"
									value={formData.password}
									onChange={(e) => handleChange('password', e.target.value)}
									required
									className={`${styles.input} ${styles.inputPassword}`}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className={styles.passwordToggle}
								>
									{showPassword ? <EyeOff className={styles.iconSmall} /> : <Eye className={styles.iconSmall} />}
								</button>
							</div>
						</div>

						<div className={styles.flexBetween}>
							<button
								type="button"
								className={styles.link}
								onClick={() => onSwitchMode && onSwitchMode('forgot-password')}
							>
								Забыли пароль?
							</button>
						</div>

						<Button
							type="submit"
							className={styles.buttonGradient}
							size="default"
							disabled={isLoading}
						>
							<LogIn className={`${styles.icon} ${styles.iconMargin}`} />
							{isLoading ? 'Вход...' : 'Войти'}
						</Button>
					</CardContent>

					<CardFooter className={`${styles.flexCol} ${styles.spaceY2} ${styles.pt6}`}>
						<p className={styles.footerText}>
							Нет аккаунта?{' '}
							<button
								type="button"
								onClick={() => onSwitchMode && onSwitchMode('signup')}
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

	if (mode === 'forgot-password') {
		return (
			<Card className={styles.card}>
				<CardHeader>
					<Button
						variant="ghost"
						className={styles.backButton}
						onClick={onBack}
					>
						<ArrowLeft className={`${styles.iconSmall} ${styles.iconMargin}`} />
						Назад
					</Button>
					<div className={styles.headerContent}>
						<div className={`${styles.logoContainer} ${styles.logoContainerSmall}`}>
							<Logo className={styles.logoImage} />
						</div>
						<CardTitle className={styles.titleGradient}>
							Восстановление пароля
						</CardTitle>
					</div>
				</CardHeader>

				{!forgotPasswordSent ? (
					<form onSubmit={handleSubmit} noValidate>
						<CardContent className={styles.spaceY4}>
							<CardDescription className={styles.textDark}>
								Введите ваш email, и мы отправим вам инструкции по восстановлению пароля.
							</CardDescription>

							<div className={styles.spaceY2}>
								<Label htmlFor="forgot-email" className={styles.label}>Email</Label>
								<Input
									id="forgot-email"
									type="email"
									placeholder="example@mail.com"
									value={forgotPasswordEmail}
									onChange={(e) => setForgotPasswordEmail(e.target.value)}
									required
									className={styles.input}
								/>
							</div>

							<Button
								type="submit"
								className={styles.buttonGradient}
								size="default"
							>
								<Send className={`${styles.icon} ${styles.iconMargin}`} />
								Отправить
							</Button>
						</CardContent>
					</form>
				) : (
					<CardContent className={`${styles.flexCol} ${styles.spaceY4} ${styles.textCenter}`}>
						<CheckCircle2 className={styles.checkIcon} style={{ width: '3rem', height: '3rem', margin: '0 auto', color: '#10b981' }} />
						<CardTitle className={styles.titleGradient}>
							Письмо отправлено!
						</CardTitle>
						<CardDescription className={styles.textDark}>
							Мы отправили инструкции по восстановлению пароля на адрес <strong>{forgotPasswordEmail}</strong>
						</CardDescription>
						<Button
							onClick={() => onSwitchMode && onSwitchMode('login')}
							className={styles.buttonGradient}
							size="default"
						>
							Вернуться к входу
						</Button>
					</CardContent>
				)}
			</Card>
		);
	}

	return (
		<Card className={styles.card}>
			<CardHeader>
				<Button
					variant="ghost"
					className={styles.backButton}
					onClick={onBack}
				>
					<ArrowLeft className={`${styles.iconSmall} ${styles.iconMargin}`} />
					Назад
				</Button>
				<div className={styles.headerContent}>
					<div className={`${styles.logoContainer} ${styles.logoContainerSmall}`}>
						<Logo className={styles.logoImage} />
					</div>
					<CardTitle className={styles.titleGradient}>
						Регистрация
					</CardTitle>
				</div>
			</CardHeader>

			<form onSubmit={handleSubmit} noValidate>
				<CardContent className={styles.spaceY4}>
					<div className={styles.spaceY2}>
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

					<div className={styles.spaceY2}>
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

					<div className={styles.spaceY2}>
						<Label htmlFor="signup-password" className={styles.label}>Пароль</Label>
						<div className={styles.relative}>
							<Input
								id="signup-password"
								type={showPassword ? 'text' : 'password'}
								placeholder="Password"
								value={formData.password}
								onChange={(e) => handleChange('password', e.target.value)}
								required
								minLength={8}
								className={`${styles.input} ${styles.inputSignup} ${styles.inputPassword}`}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className={styles.passwordToggle}
							>
								{showPassword ? <EyeOff className={styles.iconSmall} /> : <Eye className={styles.iconSmall} />}
							</button>
						</div>
						{formData.password && formData.password.length > 0 && formData.password.length < 8 && (
							<p className={styles.errorMessage}>Пароль должен содержать минимум 8 символов</p>
						)}
					</div>

					<div className={styles.spaceY2}>
						<Label htmlFor="confirm-password" className={styles.label}>Подтвердите пароль</Label>
						<div className={styles.relative}>
							<Input
								id="confirm-password"
								type={showConfirmPassword ? 'text' : 'password'}
								placeholder="Сonfirm Password"
								value={formData.confirmPassword}
								onChange={(e) => handleChange('confirmPassword', e.target.value)}
								required
								className={`${styles.input} ${styles.inputSignup} ${styles.inputPassword} ${formData.confirmPassword && (passwordsMatch ? styles.inputValid : styles.inputInvalid)}`}
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className={styles.passwordToggle}
							>
								{showConfirmPassword ? <EyeOff className={styles.iconSmall} /> : <Eye className={styles.iconSmall} />}
							</button>
							{passwordsMatch && (
								<CheckCircle2 className={styles.checkIcon} />
							)}
						</div>
					{formData.confirmPassword && !passwordsMatch && (
						<p className={styles.errorMessage}>Пароли не совпадают</p>
					)}
				</div>

				<Button
					type="submit"
					className={styles.buttonGradient}
					size="default"
					disabled={isLoading}
				>
					<UserPlus className={`${styles.icon} ${styles.iconMargin}`} />
					{isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
				</Button>
				</CardContent>

					<CardFooter className={`${styles.flexCol} ${styles.spaceY2} ${styles.pt6}`}>
						<p className={styles.footerText}>
							Уже есть аккаунт?{' '}
							<button
								type="button"
								onClick={() => onSwitchMode && onSwitchMode('login')}
								className={styles.link}
							>
								Войти
							</button>
						</p>
					</CardFooter>
			</form>
		</Card>
	);
}
