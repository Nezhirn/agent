#!/usr/bin/env python3
"""
MCP Server для Qwen Agent
Инструменты требующие контроля: bash, ssh, write_file, edit_file
"""

import os
import signal
import sqlite3
import subprocess
import threading
from pathlib import Path

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("qwen-agent-tools")


DB_PATH = str(Path(__file__).parent / "sessions.db")


@mcp.tool()
def run_bash_command(command: str) -> str:
    """Исполняет bash команду на локальном сервере.

    Требует подтверждения пользователя перед выполнением.
    Таймаут: 120 секунд.
    """
    try:
        # Используем Popen с явной группой процессов для надёжного таймаута
        # Это избегает проблем с shell=True зависанием навсегда
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.PIPE,
            text=True,
            preexec_fn=os.setsid  # Создаём новую группу процессов для корректного завершения
        )

        # Используем threading для более надёжного таймаута
        def kill_process():
            try:
                # Убиваем всю группу процессов
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                process.wait(timeout=5)
            except Exception:
                try:
                    os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                except Exception:
                    pass

        # Запускаем таймер для таймаута
        timer = threading.Timer(120.0, kill_process)
        timer.start()

        try:
            stdout, stderr = process.communicate(timeout=120)
            timer.cancel()  # Отменяем таймер если процесс завершился вовремя

            output = stdout + stderr
            return output[:8000] if output else "(пустой вывод)"
        except subprocess.TimeoutExpired:
            # Процесс не завершился - kill_process уже был вызван таймером
            return "Error: команда превысила таймаут в 120 секунд"
        except Exception as e:
            timer.cancel()
            return f"Error: {str(e)}"
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def run_ssh_command(host: str, command: str, user: str = "root") -> str:
    """Подключается по SSH к удалённому серверу и исполняет команду.

    Требует настроенного SSH ключа (~/.ssh/id_ed25519).
    Требует подтверждения пользователя перед выполнением.
    Таймаут: 120 секунд.
    """
    try:
        ssh_cmd = [
            "ssh",
            "-o", "StrictHostKeyChecking=accept-new",
            "-o", "ConnectTimeout=10",
            f"{user}@{host}",
            command
        ]

        # Используем Popen с таймером для надёжного таймаута
        process = subprocess.Popen(
            ssh_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        def kill_process():
            try:
                process.terminate()
                process.wait(timeout=5)
            except Exception:
                try:
                    process.kill()
                except Exception:
                    pass

        timer = threading.Timer(120.0, kill_process)
        timer.start()

        try:
            stdout, stderr = process.communicate(timeout=120)
            timer.cancel()
            output = stdout + stderr
            return output[:8000] if output else "(пустой вывод)"
        except subprocess.TimeoutExpired:
            return "Error: команда превысила таймаут в 120 секунд"
        except Exception as e:
            timer.cancel()
            return f"SSH Error: {str(e)}"
    except Exception as e:
        return f"SSH Error: {str(e)}"


@mcp.tool()
def write_file(path: str, content: str) -> str:
    """Записывает содержимое в файл.
    
    Требует подтверждения пользователя перед выполнением.
    Создаёт родительские директории если они не существуют.
    """
    try:
        file_path = Path(path)
        # Создаём родительские директории
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")
        return f"Файл записан: {path} ({len(content)} байт)"
    except Exception as e:
        return f"Error: {str(e)}"


@mcp.tool()
def edit_file(path: str, old_string: str, new_string: str) -> str:
    """Редактирует файл, заменяя old_string на new_string.
    
    Требует подтверждения пользователя перед выполнением.
    Заменяет только первое вхождение old_string.
    """
    try:
        file_path = Path(path)
        if not file_path.exists():
            return f"Error: файл не найден: {path}"
        
        content = file_path.read_text(encoding="utf-8")
        if old_string not in content:
            return f"Error: '{old_string[:50]}...' не найдено в файле"
        
        new_content = content.replace(old_string, new_string, 1)
        file_path.write_text(new_content, encoding="utf-8")
        return f"Файл обновлён: {path} (заменено 1 вхождение)"
    except Exception as e:
        return f"Error: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="stdio")
