# 📸 Edit Pic - Editor de Imagens Minimalista para Web

**Edit Pic** é um editor de imagens leve e minimalista para a web, projetado para realizar ajustes e transformações de forma rápida e intuitiva. O projeto foi desenvolvido como um arquivo único, sem dependências de backend ou ferramentas de compilação complexas, ideal para uso rápido e demonstração.

---

## ✨ Funcionalidades

O editor oferece um conjunto de ferramentas essenciais para edição de imagens, organizadas de forma intuitiva.

### 🎨 Ajustes

- **✨ Exposure (Exposição):** Controla o brilho geral da imagem.
- **🌗 Contrast (Contraste):** Aumenta ou diminui a diferença tonal.
- **🌈 Saturation (Saturação):** Ajusta a intensidade das cores.
- **💧 Blur (Desfoque):** Aplica um efeito de desfoque gaussiano.
- **☀️ Highlights (Realces):** Ajusta as áreas mais claras da imagem.
- **🌙 Shadows (Sombras):** Ajusta as áreas mais escuras da imagem.
- **🔪 Sharpen (Nitidez):** Aumenta a nitidez dos detalhes.
- **🧼 Unblur (Remover Desfoque):** Tenta reverter o desfoque da imagem.
- **🧽 Denoise (Redução de Ruído):** Suaviza o ruído e a granulação.

### 🖌️ Desenho

- **🎨 Paleta de Cores:** Selecione entre cores pré-definidas (ciano, magenta, azul, etc.).
- **💡 Lightness (Luminosidade):** Clareia ou escurece a cor de desenho selecionada.
- **✒️ Brush Size (Tamanho do Pincel):** Ajusta a espessura do traço.
- **↩️ Undo/Redo (Desfazer/Refazer):** Volte ou avance nos traços de desenho.

### ✂️ Transformações

- **🔄 Rotate 90° (Girar 90°):** Rotaciona a imagem em incrementos de 90 graus.
- **↔️ Flip Horizontal:** Espelha a imagem horizontalmente.
- **↕️ Flip Vertical:** Espelha a imagem verticalmente.
- **🔳 Crop (Cortar):** Permite selecionar uma área da imagem para recorte.

### ⚙️ Ações

- **🔄 Reset:** Remove todas as edições e volta a imagem ao seu estado original.
- **📥 Download:** Baixa a imagem com todas as edições aplicadas.

## 🖼️ Interface

A interface segue os princípios do Material Design 3 (M3) com um tema escuro para reduzir o cansaço visual.

_(Adicione aqui uma captura de tela da interface do editor)_

![Interface do Edit Pic](placeholder_para_screenshot.png)

## 🚀 Como Executar

Este projeto é um arquivo único (`.html`) e pode ser executado diretamente em qualquer navegador moderno.

1.  **Baixe os arquivos:** Faça o download de `index.html`, `script.js` e `style.css`.
2.  **Abra no Navegador:** Dê um duplo clique no arquivo `index.html`.
3.  **Comece a Editar:** Clique na área central para carregar uma imagem e comece a usar os controles.

## 🛠️ Tecnologias Utilizadas

- **HTML5:** Estrutura base da aplicação.
- **Tailwind CSS:** Framework utility-first para estilização rápida e responsiva.
- **JavaScript (ES6+):** Lógica do editor, manipulação do Canvas e gerenciamento dos filtros.

## 📝 Nota Importante

- **Ajustes vs. Transformações:** Filtros como Exposição, Contraste e Saturação são aplicados via CSS para uma pré-visualização rápida. Todos os outros filtros (Realces, Sombras, Nitidez) e transformações (Girar, Cortar, Desenhar) manipulam diretamente os pixels da imagem no Canvas.
- **Download:** Ao baixar a imagem, todos os filtros e transformações são "cozinhados" na imagem final, garantindo que o resultado seja exatamente o que você vê na tela.
