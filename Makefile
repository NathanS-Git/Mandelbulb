main: src/main.c
	gcc -I'include/' src/main.c src/glad.c -o output -lSDL2 -lm

clean: 
	rm output
