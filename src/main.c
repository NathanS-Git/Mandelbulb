#include <stdio.h>
#include <math.h>
#include <glad/glad.h>
#include <SDL2/SDL.h>

const int SCREEN_WIDTH = 1600;
const int SCREEN_HEIGHT = 900;

// Read the contents of a file.
const char* read_file(char* filename) { 
    char* buffer = NULL;
    size_t length;
    FILE* f = fopen(filename, "rb");
    if (f) {
        fseek(f, 0, SEEK_END);
        length = ftell(f);
        fseek(f, 0, SEEK_SET);
        buffer = malloc(length+1);
        if (buffer) {
            fread(buffer, 1, length, f);
        } 
        fclose(f);
    }
    buffer[length] = '\0';
    return (const char*)buffer;
}

unsigned int load_shader() {
    
    // Build and compile vertex shader 
    const char* vertexShaderSource = read_file("shaders/vshader.vert");
    unsigned int vertexShader;
    vertexShader = glCreateShader(GL_VERTEX_SHADER);
    glShaderSource(vertexShader, 1, &vertexShaderSource, NULL);
    glCompileShader(vertexShader);
    
    int success;
    char infoLog[512];
    glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);
    if (!success) {
        glGetShaderInfoLog(vertexShader, 512, NULL, infoLog);
        printf("Vertex shader failed %s", infoLog);
    }

    // Build and compile fragment shader
    const char* fragmentShaderSource = read_file("shaders/fshader.frag");  
    unsigned int fragmentShader;
    fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(fragmentShader, 1, &fragmentShaderSource, NULL);
    glCompileShader(fragmentShader);    
    glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
    if (!success) {
        glGetShaderInfoLog(fragmentShader, 512, NULL, infoLog);
        printf("Fragment shader failed %s", infoLog);
    }
   
    // Link shaders into one shader program
    unsigned int shaderProgram;
    shaderProgram = glCreateProgram();
    glAttachShader(shaderProgram, vertexShader);
    glAttachShader(shaderProgram, fragmentShader);
    glLinkProgram(shaderProgram);

    glGetProgramiv(shaderProgram, GL_LINK_STATUS, &success);
    if (!success) {
        glGetProgramInfoLog(shaderProgram, 512, NULL, infoLog);
    }

    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);
    return shaderProgram;
}

int main(int argc, char* args[]) {
    
    // Initialize SDL2
	if ( SDL_Init(SDL_INIT_VIDEO) < 0 ) {
		printf("SDL could not initialize. SDL_Error: %s\n", SDL_GetError() );
	}
    
    // Specify OpenGL version to SDL2
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
    //SDL_ShowCursor(SDL_FALSE);
    SDL_SetRelativeMouseMode(SDL_TRUE);

    // Create SDL2 window 
    SDL_Window* window = SDL_CreateWindow("SDL/OpenGL", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, SCREEN_WIDTH, SCREEN_HEIGHT, SDL_WINDOW_OPENGL );
    SDL_GLContext gl_context = SDL_GL_CreateContext(window);
    SDL_GL_MakeCurrent(window, gl_context);
    SDL_GL_SetSwapInterval(1); // v-sync
    if ( window == NULL ) {
        printf("Window could not be created %s\n",SDL_GetError());
    }
    
    // Load all OpenGL function pointers with GLAD
    if (!gladLoadGLLoader((GLADloadproc)SDL_GL_GetProcAddress)) {
        fprintf(stderr, "Failed to initialize OpenGL context");
        return 0;    
    }
    
    glViewport(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    
    unsigned int shaderProgram = load_shader();
    
    // Set up vertex data and buffers and configure vertex attributes 
    float vertices[] = {
        -1.0f, 1.0f, 0.0f, // top left
        1.0f, 1.0f, 0.0f, // top right 
        -1.0f, -1.0f, 0.0f, // bottom left
        1.0f, -1.0f, 0.0f // bottom right
    };
    
    unsigned int indices[] = {
        0, 1, 2,
        1, 2, 3
    };
    
    // Setup array/buffer objects for rendering.
    unsigned int VAO, VBO, EBO;
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);
    glGenBuffers(1, &EBO);
    glBindVertexArray(VAO);
    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3*sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);
    glBindVertexArray(0);

    int quit = 0;
    SDL_Event event;
    float zoom = 0.0f;
    float zoom_rate = 0.0f;
    // Mouse position info
    int x,y;
    double abs_x = 0.0f;
    double abs_y = 0.0f;
    
    while (!quit) {
        while (SDL_PollEvent(&event) != 0) {
            switch (event.type) {
                case SDL_MOUSEWHEEL:
                    zoom_rate -= event.wheel.y/100.0;
                    break;
                case SDL_KEYDOWN:
                    switch (event.key.keysym.sym) {
                        case SDLK_ESCAPE:
                            quit = 1;
                            break;
                        case SDLK_F12:
                            SDL_Surface *screen_shot = SDL_CreateRGBSurface(SDL_SWSURFACE, SCREEN_WIDTH, SCREEN_HEIGHT, 24, 0x000000FF, 0x0000FF00, 0x00FF0000, 0);
                            glReadPixels(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, GL_RGB, GL_UNSIGNED_BYTE, screen_shot->pixels);
                            SDL_SaveBMP(screen_shot, "screenshot.bmp");
                            SDL_FreeSurface(screen_shot);
                            break;
                    }
                    break;

                case SDL_QUIT:
                    quit = 1;
                    break;
                default:
                    break;
            }  
        }

        SDL_GetRelativeMouseState(&x, &y);
        zoom += zoom_rate;
        if (zoom < 0) {
            zoom = 0;
            zoom_rate = 0;
        }
        abs_x += (3.0 / (1.0 + exp(zoom))) * x;
        abs_y += (3.0 / (1.0 + exp(zoom))) * y;

        glClearColor(0.2f, 0.3f, 0.3f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);
        
        glUseProgram(shaderProgram);

        // Get uniform locations and update them.
        int u_time, u_resolution, u_mouse, u_zoom;
        u_time = glGetUniformLocation(shaderProgram, "u_time");
        u_resolution = glGetUniformLocation(shaderProgram, "u_resolution");
        u_mouse = glGetUniformLocation(shaderProgram, "u_mouse");
        u_zoom = glGetUniformLocation(shaderProgram, "u_zoom");
        glUniform1f(u_time, SDL_GetTicks()/1000.0);
        glUniform2f(u_resolution, SCREEN_WIDTH, SCREEN_HEIGHT);
        glUniform2f(u_mouse, abs_x, -abs_y); 
        glUniform1f(u_zoom, zoom);

        // Draw to screen
        glBindVertexArray(VAO); 
        glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);
        SDL_GL_SwapWindow(window);        
    }    
 
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 0;
}
