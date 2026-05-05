import asyncio
from playwright.async_api import async_playwright
import os

async def generar_pdf():
    async with async_playwright() as p:
        # Iniciamos el navegador
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # 1. Cargar tu archivo local (asegurate de que la ruta sea correcta)
        # Usamos 'file://' para que cargue desde tu disco D:
        path_archivo = os.path.abspath("index.html")
        await page.goto(f"file://{path_archivo}")

        # 2. Esperamos a que carguen las animaciones y tipografías
        await page.wait_for_timeout(2000) 

        # 3. Generar el PDF de toda la presentación
        # 'print_background' es clave para que se vea el gris oscuro y los colores
        await page.pdf(
            path="Presentacion_Beron_Astrada.pdf",
            format="A4",
            landscape=True,
            print_background=True,
            display_header_footer=False,
            margin={"top": "0px", "right": "0px", "bottom": "0px", "left": "0px"}
        )

        print("¡Listo! PDF generado: Presentacion_Beron_Astrada.pdf")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(generar_pdf())