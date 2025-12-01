# WhatsChat - Trabalho de Segurança computacional
App de comunicação segura (chat) para exercitar os conceitos de segurança computacional do semestre 2025.2 - UnB.

## Requisitos para execução
+ Orientações assumem (necessário) python e (opcional) um virtualizador de ambientes já instalado na máquina.

## Passo a passo para execução
1. Crie o virtual environment com qualquer virtualizador de ambiente:
    + Exemplo a seguir com venv do próprio python: `$ python -m venv venv`
2. baixe as bibliotecas e instancie o banco de dados
    ```bash
    $ cd whatschat-flask
    $ pip install -r ./requirements.txt
    $ python app.py
    ```