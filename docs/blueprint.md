# **App Name**: PJUD Scraper

## Core Features:

- Parameter Input: Accepts court case parameters (Competencia, Corte, Tribunal, Libro/Tipo, Rol, Año) via GET or input fields.
- Execution Button: A button to trigger the scraping process.
- Data Scraping: Scrapes the PJUD website, navigates to 'Consulta de Causas', and populates the form with user-provided parameters. It handles potential anti-scraping measures by implementing delay and using rotating proxies
- Data Extraction: Extracts the last 3 entries (or less if there are less) from the 'Historia' tab, including links to associated PDFs. Also, extracts data from the 'Escritos por Resolver' tab, if available.
- Data Presentation: Displays the scraped data, including entries from 'Historia' (with PDF download links) and 'Escritos por Resolver', in a user-friendly format.

## Style Guidelines:

- Primary color: Light gray (#f5f5f5) for a clean background.
- Secondary color: White (#ffffff) for content containers.
- Accent color: Teal (#008080) to highlight important elements and calls to action.
- Use a clear, tabular layout for displaying the scraped data, making it easy to read and understand.
- Use simple, recognizable icons for actions like downloading PDFs.

## Original User Request:
haz una pagina donde al darte unos parámetros, usarás esos parametros para hacer webscraping en https://oficinajudicialvirtual.pjud.cl/indexN.php y extraeras cierta información necesaria para luego mostrarla como resultado en la página creada. Te describo los pasos. Adicional te adjunto una captura de pantalla con datos válidos para cuando analices la página de oficinajudicialvirtual y puedas realizar todo el flujo para crear bien esta página.

datos ejemplo reales:

- Te dejo datos de ejemplo para que encuentres resultados en la imagen adjunta
- estos son los datos que espero como resultado en la pagina.
"Folio	Doc.	Anexo	Etapa	Trámite	Desc. Trámite	Fec. Trámite	Foja	Georref.
17	
Descargar Documento
Terminada	Resolución	Archivo del expediente en el Tribunal	03/07/2023	2	
16	
Descargar Documento
Excepciones	(CER)Certificacion	Certifica que no se opuso excepciones	04/07/2022	12	
15	
Descargar Documento
Excepciones	Resolución	Mero trámite	04/07/2022	11"
Con el PDF para poder descargar
y en la parte de escritos sin resolver en este caso esta vacio

1.- puedas introducir los datos via parametros get o por input al navegador:
Competencia
Corte
Tribunal
Libro/Tipo
Rol
Año
(si llegan por get se ejecutará directamente la app)
2.- pon un botón para ejecutar (para cuando lo hagan por teclado)
3.- al ejecutar ha de realizar la siguiente tarea
4.- ir a la pagina https://oficinajudicialvirtual.pjud.cl/indexN.php
5.- entrar a "consulta causa"
6.- rellenar los datos con los datos que nos puso el usuario en nuestra web
7.- hacer buscar
8.- harás click en la lupa del resultado del caso que apareció
9.- extraeras de la pestaña historia la información de los últimos 3 registros que haya con su PDF
10.- extraeras información si la hay de la pestaña "escritos por resolver"
11.- Mostrarás toda la info recopilada en la web
12 importante tener en cuenta que la página puede tener sistemas anti web scraper
  