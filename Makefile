# Короткие команды для Docker Compose. На Windows без make используйте команды из README.
COMPOSE := docker compose
APP_PORT ?= 3000

.PHONY: help up down restart logs reset clean status local

help: ## Список команд
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-9s %s\n", $$1, $$2}'

up: ## Собрать и запустить приложение вместе с SQL Server
	$(COMPOSE) up --build -d --wait
	@echo "Книжная полка: http://localhost:$(APP_PORT)  (admin / admin123, reader / reader123)"

down: ## Остановить (данные сохраняются)
	$(COMPOSE) down

restart: down up ## Перезапустить

logs: ## Логи приложения и БД
	$(COMPOSE) logs -f

status: ## Состояние контейнеров
	$(COMPOSE) ps

reset: ## Пересоздать таблицы с демо-данными (все данные будут удалены)
	$(COMPOSE) exec app node scripts/init-db.js --reset

clean: ## Остановить и удалить все данные (БД и обложки)
	$(COMPOSE) down -v

local: ## Запуск без Docker (нужен свой SQL Server и файл .env)
	npm install
	npm run db:init
	npm start
