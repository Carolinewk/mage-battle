# Mage Battle

Protótipo web 2D em canvas de um duelo de magos em pixel art.

## Como rodar

Use um servidor estático simples na pasta do projeto:

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Controles

- `Clique direito`: movimentação no campo
- `Mouse`: mira da varinha
- `Q`: Fireball
- `W`: Stun Shot
- `E`: Speed Boost
- `R`: Thunder Strike
- `Espaço`: reinicia após o fim do duelo

## Gameplay

- Os magos agora usam navegação por clique, no estilo arena/MOBA.
- Os magos usam um visual temporário simples em estilo stick figure.
- A arena do duelo foi ampliada para dar mais espaço de movimentação.
- Fireball, Stun Shot e Thunder Strike respeitam alcance máximo real.

## Estrutura

- `index.html`: casca da página e canvas
- `styles.css`: layout responsivo e apresentação geral
- `src/main.js`: bootstrap, resize e loop principal
- `src/game.js`: estado do jogo, IA, habilidades e colisões
- `src/render.js`: arena, HUD, personagens e efeitos
- `src/input.js`: teclado, mouse e mapeamento da mira
- `src/utils.js`: helpers matemáticos e de arena
