'use client';

/**
 * @file Service for scraping data from the PJUD website.
 */

export interface CourtCaseParameters {
    competencia: string;
    corte: string;
    tribunal: string;
    libroTipo: string;
    rol: string;
    ano: string;
}

export interface HistoryEntry {
    folio: string;
    doc: string;
    anexo: string;
    etapa: string;
    tramite: string;
    descTramite: string;
    fecTramite: string;
    foja: string;
    georref: string;
    pdfUrl: string;
}

export interface UnresolvedWriting {
    content: string;
}

export interface PjudData {
    history: HistoryEntry[];
    unresolvedWritings: UnresolvedWriting[];
}

import { useToast } from "@/hooks/use-toast"

let puppeteerBase: any;
let puppeteerExtra: any;
let StealthPlugin: any;
let ProxyList: any;

if (typeof window === 'undefined') {
  try {
    puppeteerBase = require('puppeteer');
    puppeteerExtra = require('puppeteer-extra');
    StealthPlugin = require('puppeteer-extra-plugin-stealth');
    try{ProxyList = require('rotating-proxy-list').ProxyList;} catch(e){}
  } catch (error) {
    console.error('Failed to load puppeteer modules:', error);
    // Handle the error appropriately, e.g., set a flag or use a fallback
  }
}

let puppeteer: any;
// Initialize puppeteer with stealth plugin only when available
if (puppeteerExtra && StealthPlugin) {
  //puppeteer = puppeteerExtra.use(StealthPlugin());
}

/**
 * Asynchronously retrieves data from the PJUD website.
 *
 * @param params The court case parameters to use to query the PJUD website.
 * @param logFn A function to output logs during the scraping process.
 * @returns A promise that resolves to a PjudData object containing the scraped data.
 */
export async function getPjudData(params: CourtCaseParameters, logFn: (log: string) => void): Promise<PjudData> {
  if (typeof window !== 'undefined') {
    console.warn('Puppeteer cannot be run in the browser environment.');
    return { history: [], unresolvedWritings: [] };
  }

  const { toast } = useToast()

  // Start the browser with stealth plugin
  //puppeteer.use(StealthPlugin());

  let proxyList:any = null;
  if(ProxyList){
    proxyList = new (ProxyList as any)({
      sources: ['http://pubproxy.com/api/proxy?limit=5&format=txt&port=8080'], // this can be an array of URLs
    });
  }
  // Launch the browser using a proxy
   const browser = await (puppeteerBase as any).launch({
     headless: false, // set to false to see the browser
     ignoreDefaultArgs: ['--mute-audio'],
     args: [
       '--no-sandbox',
       '--disable-setuid-sandbox',
       //`--proxy-server=${proxy}`,
     ],
   });

  try {
    const page = await browser.newPage();
    if (puppeteerExtra && StealthPlugin) {
      await page.evaluateOnNewDocument((stealth) => {
          stealth().enabled = true
        }, (StealthPlugin as any)().stealth);
    }
   logFn('New page created.');

    logFn('Navigating to PJUD website...');
    // Go to the PJUD website
    await page.goto('https://oficinajudicialvirtual.pjud.cl/indexN.php', { waitUntil: 'domcontentloaded' });
    logFn('Navigated to PJUD website.');

    // Click on "Consulta de Causas"
    logFn('Clicking on "Consulta de Causas"...');
    await page.click('a[href="consultaCausa.php"]');
    logFn('Clicked on "Consulta de Causas".');

    // Wait for the form to load
    logFn('Waiting for the form to load...');
    await page.waitForSelector('select[name="competencia"]');
    logFn('Form loaded.');

      // Populate the form with the provided parameters
       logFn(`Populating form with parameters: ${JSON.stringify(params)}`);
       await page.select('select[name="competencia"]', params.competencia);
       logFn(`Selected competencia: ${params.competencia}`);
       await page.select('select[name="corte"]', params.corte);
        logFn(`Selected corte: ${params.corte}`);
       await page.select('select[name="tribunal"]', params.tribunal);
        logFn(`Selected tribunal: ${params.tribunal}`);
       await page.select('select[name="libroTipo"]', params.libroTipo);
        logFn(`Selected libroTipo: ${params.libroTipo}`);
       await page.type('input[name="rol"]', params.rol);
        logFn(`Typed rol: ${params.rol}`);
       await page.type('input[name="anio"]', params.ano);
       logFn(`Typed ano: ${params.ano}`);
       logFn('Form populated.');

    // Submit the form
    logFn('Submitting the form...');
    await page.click('input[name="Buscar"]');
    logFn('Form submitted.');

    // Wait for the results to load
    logFn('Waiting for the results to load...');
    await page.waitForSelector('img[name="boton_consulta_causa"]', { timeout: 5000 });
    logFn('Results loaded.');

    // Check if results are present
    logFn('Checking if results are present...');
    const resultFound = await page.$('img[name="boton_consulta_causa"]');
    if (!resultFound) {
      logFn('No results found for the given parameters.');
      return { history: [], unresolvedWritings: [] };
    }
    logFn('Results found.');

    // Click on the magnifying glass icon
    logFn('Clicking on the magnifying glass icon...');
    await page.click('img[name="boton_consulta_causa"]');
    logFn('Magnifying glass icon clicked.');

    // Wait for the case details to load
    logFn('Waiting for case details to load...');
    await page.waitForSelector('a[href="#tab-historia"]', { timeout: 5000 });
    logFn('Case details loaded.');

    // Go to the "Historia" tab
    logFn('Navigating to the "Historia" tab...');
    await page.click('a[href="#tab-historia"]');
    logFn('Navigated to the "Historia" tab.');

    // Extract data from the "Historia" tab
    logFn('Extracting data from the "Historia" tab...');
    const history: HistoryEntry[] = [];
    const historyTableRows = await page.$$eval('#tablaHistoria tbody tr', (rows) => {
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.map(cell => cell.textContent?.trim() || '');
      });
    });

    for (let i = 0; i < Math.min(historyTableRows.length, 3); i++) {
      const rowData = historyTableRows[i];
        logFn(`Processing history row ${i + 1}: ${JSON.stringify(rowData)}`);
      if (rowData.length >= 10) {
        const folio = rowData[0];
        const etapa = rowData[3];
        const tramite = rowData[4];
        const descTramite = rowData[5];
        const fecTramite = rowData[6];
        const foja = rowData[7];
        //const georref = rowData[8];

        // Extract PDF URL from the row
          logFn(`Extracting PDF URL from row ${i + 1}...`);
        const pdfUrl = await page.$eval(`#tablaHistoria tbody tr:nth-child(${i + 1}) td:nth-child(2) a`, (a: any) => {
          return a.href;
        });
          logFn(`PDF URL extracted: ${pdfUrl}`);

        history.push({
          folio,
          doc: '',
          anexo: '',
          etapa,
          tramite,
          descTramite,
          fecTramite,
          foja,
          georref: '',
          pdfUrl,
        });
        logFn(`Extracted history entry: ${folio}, ${etapa}, ${tramite}, ${descTramite}, ${fecTramite}, ${foja}, ${pdfUrl}`);
        console.log({folio, etapa, tramite,descTramite,fecTramite,foja,pdfUrl})
       } else {
            logFn(`Skipping row ${i + 1} due to insufficient data.`);
        }
     }
     logFn('Extracted data from the "Historia" tab.');

    // Extract data from the "Escritos por Resolver" tab (if available)
    logFn('Checking for "Escritos por Resolver" tab...');
    const escritosTab = await page.$('a[href="#tab-escritos"]');
    if (escritosTab) {
      logFn('Navigating to the "Escritos por Resolver" tab...');
      await page.click('a[href="#tab-escritos"]');
      logFn('Navigated to the "Escritos por Resolver" tab.');

      logFn('Extracting data from the "Escritos por Resolver" tab...');
      const unresolvedWritings: UnresolvedWriting[] = await page.$$eval('#tablaEscritosPorResolver tbody tr td', (cells) => {
        return Array.from(cells).map(cell => ({ content: cell.textContent?.trim() || '' }));
      });
      logFn(`Extracted ${unresolvedWritings.length} unresolved writings.`);

      await browser.close();
      logFn('Browser closed.');
      return { history, unresolvedWritings };
    } else {
      logFn('No "Escritos por Resolver" tab found.');
      
      await browser.close();
      logFn('Browser closed.');
      return { history, unresolvedWritings: [] };
    }

  } catch (error: any) {
    logFn(`Scraping failed: ${error}`);
    console.error('Scraping failed:', error);
     toast({
         title: "Scraping failed",
         description: error.message,
       })
    await browser.close();
    logFn('Browser closed due to error.');
    return { history: [], unresolvedWritings: [] };
  }
}
