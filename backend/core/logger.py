import logging
import sys
from datetime import datetime

# Configuração de cores para terminal (opcional)
class ColoredFormatter(logging.Formatter):
    """Formatter com cores para melhor visualização no terminal"""
    
    grey = "\x1b[38;21m"
    blue = "\x1b[38;5;39m"
    yellow = "\x1b[38;5;226m"
    red = "\x1b[38;5;196m"
    bold_red = "\x1b[31;1m"
    reset = "\x1b[0m"

    FORMATS = {
        logging.DEBUG: grey + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + reset,
        logging.INFO: blue + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + reset,
        logging.WARNING: yellow + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + reset,
        logging.ERROR: red + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + reset,
        logging.CRITICAL: bold_red + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + reset
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt, datefmt='%Y-%m-%d %H:%M:%S')
        return formatter.format(record)


def setup_logger(name: str = "zapvoice", level: str = "INFO") -> logging.Logger:
    """
    Configura e retorna um logger estruturado.
    
    Args:
        name: Nome do logger (geralmente __name__ do módulo)
        level: Nível de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Logger configurado
    """
    logger = logging.getLogger(name)
    
    # Evita duplicação de handlers
    if logger.handlers:
        return logger
    
    # Converte string para nível
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(log_level)
    logger.propagate = False # Evita duplicar logs se o root logger tiver handlers
    
    # Handler para console
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(ColoredFormatter())
    logger.addHandler(console_handler)
    
    # Handler para arquivo (Novo)
    file_handler = logging.FileHandler("zapvoice_debug.log", encoding="utf-8")
    file_handler.setLevel(log_level)
    file_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt='%Y-%m-%d %H:%M:%S'))
    logger.addHandler(file_handler)
    
    return logger


# Logger padrão da aplicação
logger = setup_logger("zapvoice", "INFO")
