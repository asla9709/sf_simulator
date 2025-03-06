# 3D Walking Demo Documentation

## Development Tools

### Local Development Server
The project includes a development server with hot reloading capabilities.

To start the development server:
1. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the server:
   ```bash
   python tools/serve.py
   ```
3. Open `http://localhost:8000` in your browser

The server features:
- Hot reloading when files change
- Preserves camera position between reloads
- Serves static files (images, audio, JSON)
- WebSocket connection for live updates

## Adding New Characters

Characters can be added by creating a new character configuration:

1. Create a new directory under `assets/characters/` for your character
2. Add required sprite images to the character directory
3. Create a character JSON file with the following structure:
   ```json
   {
       "name": "CharacterName",
       "sprites": {
           "idle": "idle.png",
           "talking": [
               "talk1.png",
               "talk2.png"
           ]
       },
       "dialogue": [
           [
               "First conversation line 1",
               "First conversation line 2"
           ],
           [
               "Second conversation line 1",
               "Second conversation line 2"
           ]
       ],
       "width": 1.5,
       "height": 3
   }
   ```
4. Add the character to the game by modifying `setupCharacters()` in `js/game.js`:
   ```javascript
   const character = await Character.loadFromJson('./assets/characters/yourcharacter/character.json');
   character.position.set(x, y, z);
   this.addObject(character);
   ```

### Character Configuration Properties
- `name`: Display name of the character
- `sprites`: Object containing sprite image paths
  - `idle`: Default standing sprite
  - `talking`: Array of sprites for talking animation
- `dialogue`: Array of conversation arrays. Each sub-array represents one complete conversation
- `width`: Character width in world units
- `height`: Character height in world units


