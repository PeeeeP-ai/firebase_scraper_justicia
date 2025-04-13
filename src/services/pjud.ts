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
    ProxyList = require('rotating-proxy-list').ProxyList;
  } catch (error) {
    console.error('Failed to load puppeteer modules:', error);
    // Handle the error appropriately, e.g., set a flag or use a fallback
  }
}

let puppeteer: any;
if (puppeteerExtra && StealthPlugin) {
  puppeteer = puppeteerExtra.use(StealthPlugin());
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

  const proxyList = new (ProxyList as any)({
    sources: ['http://pubproxy.com/api/proxy?limit=5&format=txt&port=8080'], // this can be an array of URLs
  });

  // Launch the browser using a proxy
  const browser = await (puppeteerBase as any).launch({
    headless: "new", // set to false to see the browser
    ignoreDefaultArgs: ['--mute-audio'],
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      //`--proxy-server=${proxy}`,
    ],
  });

  try {
    const page = await browser.newPage();
    logFn('Navigating to PJUD website...');

    // Go to the PJUD website
    await page.goto('https://oficinajudicialvirtual.pjud.cl/indexN.php');
    logFn('Entered PJUD website.');

    // Enter "Consulta de Causas"
    await page.select('select#id_tipo_busqueda', '1');
    logFn('Entered "Consulta de Causas".');

    // Fill in the form with the provided parameters
    await page.select('select#id_competencia', params.competencia);
    await page.select('select#id_corte', params.corte);
    await page.select('select#id_tribunal', params.tribunal);
    await page.select('select#id_libro', params.libroTipo);
    await page.type('input#rol_numero', params.rol);
    await page.type('input#rol_anio', params.ano);
    logFn('Filled in the form with the provided parameters.');

    // Click the search button
    logFn('Clicking the search button...');
    await Promise.all([
      page.click('input[name="Buscar"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    logFn('Search button clicked and navigation completed.');

    // Click on the magnifying glass icon of the result
    logFn('Clicking on the magnifying glass icon...');
    await Promise.all([
      page.click('img[name="boton_consulta_causa"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    logFn('Magnifying glass icon clicked and navigation completed.');

    // Extract data from the "Historia" tab
    logFn('Extracting data from the "Historia" tab...');
    await page.waitForSelector('#tab_detalle_causa > ul > li:nth-child(2) > a');
    await page.click('#tab_detalle_causa > ul > li:nth-child(2) > a');
    logFn('Clicked on the "Historia" tab.');

    // Extract the last 3 entries from the "Historia" tab
    const historyEntries: HistoryEntry[] = [];
    const historyTableRows = await page.$$('table#tabla_historial > tbody > tr');
    logFn(`Found ${historyTableRows.length} rows in the history table.`);

    for (let i = Math.max(0, historyTableRows.length - 3); i < historyTableRows.length; i++) {
      const row = historyTableRows[i];
      const cells = await row.$$('td');

      if (cells.length === 9) {
        const folio = await cells[0].evaluate(node => node.textContent?.trim() || '');
        const etapa = await cells[3].evaluate(node => node.textContent?.trim() || '');
        const tramite = await cells[4].evaluate(node => node.textContent?.trim() || '');
        const descTramite = await cells[5].evaluate(node => node.textContent?.trim() || '');
        const fecTramite = await cells[6].evaluate(node => node.textContent?.trim() || '');
        const foja = await cells[7].evaluate(node => node.textContent?.trim() || '');

        // Extract the PDF URL from the last cell
        let pdfUrl = '';
        const downloadLink = await cells[8].$('a');
        if (downloadLink) {
          pdfUrl = await downloadLink.evaluate(node => (node as HTMLAnchorElement).href || '');
        }

        historyEntries.push({
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
      }
    }
    logFn('Extracted data from the "Historia" tab.');

    // Extract data from the "Escritos por Resolver" tab
    logFn('Extracting data from the "Escritos por Resolver" tab...');
    await page.waitForSelector('#tab_detalle_causa > ul > li:nth-child(3) > a');
    await page.click('#tab_detalle_causa > ul > li:nth-child(3) > a');
    logFn('Clicked on the "Escritos por Resolver" tab.');

    const unresolvedWritings: UnresolvedWriting[] = [];
    // check if the element exists
    const element = await page.$('#contenedor_escritos_resolver > div > p');
    if (element) {
      const text = await element.evaluate(node => node.textContent?.trim() || '');
      unresolvedWritings.push({ content: text });
      logFn(`Extracted unresolved writing: ${text}`);
    }
    logFn('Extracted data from the "Escritos por Resolver" tab.');

    return {
      history: historyEntries,
      unresolvedWritings: unresolvedWritings,
    };

  } catch (error: any) {
    console.error('Scraping failed:', error);
    toast({
        title: "Scraping failed",
        description: error.message || 'Failed to scrape data from PJUD website',
        variant: "destructive"
      })
    logFn(`Scraping failed: ${error.message || 'Failed to scrape data from PJUD website'}`);
    return { history: [], unresolvedWritings: [] };
    //throw new Error(error.message || 'Failed to scrape data from PJUD website');
  } finally {
    await browser.close();
    logFn('Browser closed.');
  }
}
