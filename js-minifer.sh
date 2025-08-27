#!/usr/bin/env python3
import re
import sys

def optimize_js(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        code = f.read()

    # Удаляем многострочные комментарии
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    # Удаляем однострочные комментарии
    code = re.sub(r'//.*', '', code)
    # Удаляем переносы строк и лишние пробелы
    code = re.sub(r'\s+', ' ', code)
    # Удаляем пробелы вокруг символов {}();=,+-*/<> и т.д.
    code = re.sub(r'\s*([{}();=,+\-*/<>])\s*', r'\1', code)

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(code.strip())

if __name__ == "__main__":
    optimize_js(sys.argv[1], sys.argv[2])


