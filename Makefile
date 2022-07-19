IMAGE:=samarthgr/wordle-multiplayer-wrapper

docker:
	@docker build -t $(IMAGE) .