import json
from datetime import datetime
from pathlib import Path

import httpx


BASE_URL = "http://localhost:8000"
TIMEOUT = 120.0


def test_health() -> dict:
    print("\n" + "=" * 80)
    print("1. HEALTH CHECK")
    print("=" * 80)

    try:
        response = httpx.get(f"{BASE_URL}/health", timeout=10.0)
        response.raise_for_status()
        result = response.json()

        print(f"✓ Статус: {response.status_code}")
        print(f"Ответ: {result}")

        return {
            "test": "health",
            "status": response.status_code,
            "response": result,
            "success": True,
        }
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return {
            "test": "health",
            "error": str(e),
            "success": False,
        }


def test_chat(message: str, domain: str | None = None, test_name: str = "Chat") -> dict:
    print("\n" + "=" * 80)
    print(f"{test_name}")
    print("=" * 80)
    print(f"Запрос: {message[:100]}...")
    if domain:
        print(f"Домен: {domain}")

    try:
        payload = {"message": message}
        if domain:
            payload["domain"] = domain

        response = httpx.post(
            f"{BASE_URL}/chat",
            json=payload,
            timeout=TIMEOUT,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
        response.raise_for_status()
        result = response.json()

        print(f"✓ Статус: {response.status_code}")
        print(f"Ответ ({len(result['response'])} символов):")
        print(f"{result['response'][:200]}...")

        return {
            "test": test_name,
            "domain": domain,
            "request": message,
            "status": response.status_code,
            "response": result["response"],
            "success": True,
        }
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return {
            "test": test_name,
            "domain": domain,
            "request": message,
            "error": str(e),
            "success": False,
        }


def main():
    print("=" * 80)
    print("ТЕСТИРОВАНИЕ COPILOT LLM API")
    print("=" * 80)
    print(f"Время запуска: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = []

    results.append(test_health())

    results.append(
        test_chat(
            message="Привет! Напиши короткое приветствие для бизнес-ассистента, который помогает владельцам малого бизнеса.",
            domain=None,
            test_name="2. ОБЩИЙ ЧАТ (GENERAL)",
        )
    )

    results.append(
        test_chat(
            message="Какие основные документы нужны для найма первого сотрудника в малый бизнес?",
            domain="legal",
            test_name="3. ЮРИДИЧЕСКИЙ ДОМЕН (LEGAL)",
        )
    )

    results.append(
        test_chat(
            message="Напиши три идеи для поста ВКонтакте для кофейни, которая запускает акцию 'Второй кофе в подарок'",
            domain="marketing",
            test_name="4. МАРКЕТИНГОВЫЙ ДОМЕН (MARKETING)",
        )
    )

    results.append(
        test_chat(
            message="Объясни простыми словами, что такое УСН и как она помогает малому бизнесу экономить на налогах?",
            domain="finance",
            test_name="5. ФИНАНСОВЫЙ ДОМЕН (FINANCE)",
        )
    )

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    log_file = Path(__file__).parent / f"test_results_{timestamp}.json"

    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    txt_file = Path(__file__).parent / f"test_results_{timestamp}.txt"
    with open(txt_file, "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write("ТЕСТИРОВАНИЕ COPILOT LLM API\n")
        f.write("=" * 80 + "\n")
        f.write(f"Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        for result in results:
            f.write("=" * 80 + "\n")
            f.write(f"{result['test']}\n")
            f.write("=" * 80 + "\n")

            if result["success"]:
                f.write(f"Статус: {result['status']}\n")
                if "domain" in result and result["domain"]:
                    f.write(f"Домен: {result['domain']}\n")
                if "request" in result:
                    f.write(f"Запрос: {result['request']}\n")
                if "response" in result:
                    f.write(f"\nОТВЕТ:\n{result['response']}\n")
            else:
                f.write(f"ОШИБКА: {result['error']}\n")

            f.write("\n")

        f.write("=" * 80 + "\n")
        f.write(f"Завершено: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    print("\n" + "=" * 80)
    print("ИТОГИ ТЕСТИРОВАНИЯ")
    print("=" * 80)

    success_count = sum(1 for r in results if r["success"])
    total_count = len(results)

    print(f"Успешно: {success_count}/{total_count}")
    print(f"\nРезультаты сохранены:")
    print(f"  JSON: {log_file}")
    print(f"  TXT:  {txt_file}")
    print("=" * 80)


if __name__ == "__main__":
    main()
