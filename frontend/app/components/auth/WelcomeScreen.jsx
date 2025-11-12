import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { LogIn, UserPlus } from "lucide-react";
import { Logo } from "./Logo";
import styles from "./auth.module.css";

export function WelcomeScreen({ onSelectAction }) {
	return (
		<Card className={styles.card}>
			<CardHeader className="text-center">
				<div className={`${styles.logoContainer} ${styles.logoContainerLarge}`}>
					<Logo className={styles.logoImage} variant="gradient" />
				</div>
				<CardTitle className={styles.titleGradient}>
					Добро пожаловать
				</CardTitle>
				<CardDescription>
					Выберите действие для продолжения
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<Button
					onClick={() => onSelectAction('login')}
					className={styles.buttonPrimary}
					size="lg"
				>
					<LogIn className="mr-2 h-5 w-5" />
					Войти
				</Button>
				<Button
					onClick={() => onSelectAction('signup')}
					variant="outline"
					className={styles.buttonSecondary}
					size="lg"
				>
					<UserPlus className="mr-2 h-5 w-5" />
					Регистрация
				</Button>
			</CardContent>
		</Card>
	);
}


