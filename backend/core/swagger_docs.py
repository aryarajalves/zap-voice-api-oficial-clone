from fastapi.responses import HTMLResponse

def get_swagger_ui_html() -> HTMLResponse:
    """
    Retorna o HTML customizado para o Swagger UI com filtro visual por categoria/tag.
    """
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
    <link type="text/css" rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <link rel="shortcut icon" href="https://fastapi.tiangolo.com/img/favicon.png">
    <title>ZapVoice API Oficial - Swagger UI</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #0f172a;
        }
        .category-select-container {
            margin: 20px auto 10px auto;
            max-width: 1460px;
            padding: 0 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: sans-serif;
        }
        .category-select-label {
            font-weight: bold;
            font-size: 14px;
            color: #3b82f6;
        }
        .category-select {
            padding: 8px 32px 8px 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 14px;
            outline: none;
            cursor: pointer;
            background-color: #ffffff;
            color: #334155;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            appearance: none;
            -webkit-appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 20px;
            transition: all 0.2s;
        }
        .category-select:hover {
            border-color: #cbd5e1;
            box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.05);
        }
        .category-select:focus {
            border-color: #3b82f6;
        }
    </style>
    </head>
    <body>
    <div id="swagger-ui">
    </div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
        const ui = SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout",
            deepLinking: true,
            showExtensions: true,
            showCommonExtensions: true,
            filter: true
        });
        window.ui = ui;

        const interval = setInterval(() => {
            const tags = document.querySelectorAll('.opblock-tag-section h4 a span');
            if (tags.length > 0) {
                clearInterval(interval);
                
                const filterContainer = document.createElement('div');
                filterContainer.className = 'category-select-container';
                
                const label = document.createElement('span');
                label.className = 'category-select-label';
                label.innerText = 'Filtrar por Categoria:';
                
                const select = document.createElement('select');
                select.className = 'category-select';
                
                const optionAll = document.createElement('option');
                optionAll.value = 'all';
                optionAll.innerText = 'Todas as Categorias';
                select.appendChild(optionAll);
                
                const tagNames = Array.from(tags).map(el => el.innerText.trim());
                const uniqueTags = [...new Set(tagNames)];
                
                uniqueTags.forEach(tag => {
                    const opt = document.createElement('option');
                    opt.value = tag;
                    opt.innerText = tag;
                    select.appendChild(opt);
                });
                
                select.addEventListener('change', (e) => {
                    const selected = e.target.value;
                    const sections = document.querySelectorAll('.opblock-tag-section');
                    sections.forEach(section => {
                        const tagEl = section.querySelector('h4 a span');
                        if (tagEl) {
                            const currentTagName = tagEl.innerText.trim();
                            if (selected === 'all' || currentTagName === selected) {
                                section.style.display = 'block';
                            } else {
                                section.style.display = 'none';
                            }
                        }
                    });
                });
                
                filterContainer.appendChild(label);
                filterContainer.appendChild(select);
                
                const wrapper = document.querySelector('.swagger-ui .wrapper');
                if (wrapper) {
                    wrapper.parentNode.insertBefore(filterContainer, wrapper.nextSibling);
                }
            }
        }, 300);
    }
    </script>
    </body>
    </html>
    """
    return HTMLResponse(html_content)
