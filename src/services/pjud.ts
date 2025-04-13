'use client';

/**
 * @file Service for scraping data from the PJUD website.
 */

import puppeteerBase from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
const puppeteer = puppeteerExtra.use(StealthPlugin());
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import {ProxyList} from 'rotating-proxy-list';

/**
 * Represents a court case parameter.
 */
export interface CourtCaseParameters {
  /**
   * The Competencia of the court case.
   */
  competencia: string;
  /**
   * The Corte of the court case.
   */
  corte: string;
  /**
   * The Tribunal of the court case.
   */
  tribunal: string;
  /**
   * The Libro/Tipo of the court case.
   */
  libroTipo: string;
  /**
   * The Rol of the court case.
   */
  rol: string;
  /**
   * The Año of the court case.
   */
  ano: string;
}

/**
 * Represents a history entry from the PJUD website.
 */
export interface HistoryEntry {
  /**
   * The Folio of the entry.
   */
  folio: string;
  /**
   * The Doc of the entry.
   */
  doc: string;
  /**
   * The Anexo of the entry.
   */
  anexo: string;
  /**
   * The Etapa of the entry.
   */
  etapa: string;
  /**
   * The Tramite of the entry.
   */
  tramite: string;
  /**
   * The Desc. Tramite of the entry.
   */
  descTramite: string;
  /**
   * The Fec. Tramite of the entry.
   */
  fecTramite: string;
  /**
   * The Foja of the entry.
   */
  foja: string;
  /**
   * The Georref of the entry.
   */
  georref: string;
  /**
   * The URL of the PDF document associated with the entry.
   */
  pdfUrl: string;
}

/**
 * Represents an unresolved writing from the PJUD website.
 */
export interface UnresolvedWriting {
  /**
   * The content of the unresolved writing.
   */
  content: string;
}

/**
 * Represents the data scraped from the PJUD website.
 */
export interface PjudData {
  /**
   * The history entries from the PJUD website.
   */
  history: HistoryEntry[];
  /**
   * The unresolved writings from the PJUD website.
   */
  unresolvedWritings: UnresolvedWriting[];
}

/**
 * Retrieves proxies from a URL and checks if the URL returns proxies in the expected format.
 * @param url The URL to fetch proxies from.
 * @returns A promise that resolves to an array of proxy strings.
 */


/**
 * Asynchronously retrieves data from the PJUD website.
 *
 * @param params The court case parameters to use to query the PJUD website.
 * @returns A promise that resolves to a PjudData object containing the scraped data.
 */
export async function getPjudData(params: CourtCaseParameters): Promise<PjudData> {
  // Start the browser with stealth plugin
  //puppeteer.use(StealthPlugin());

  const proxyList = new ProxyList({
    sources: ['http://pubproxy.com/api/proxy?limit=5&format=txt&port=8080'], // this can be an array of URLs
  });

  // Launch the browser using a proxy
  const browser = await puppeteerBase.launch({
    headless: "new", // set to false to see the browser
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      //`--proxy-server=${proxy}`,
    ],
  });

  try {
    const page = await browser.newPage();

    // Go to the PJUD website
    await page.goto('https://oficinajudicialvirtual.pjud.cl/indexN.php');

    // Enter "Consulta de Causas"
    await page.select('select#id_tipo_busqueda', '1');

    // Fill in the form with the provided parameters
    await page.select('select#id_competencia', params.competencia);
    await page.select('select#id_corte', params.corte);
    await page.select('select#id_tribunal', params.tribunal);
    await page.select('select#id_libro', params.libroTipo);
    await page.type('input#rol_numero', params.rol);
    await page.type('input#rol_anio', params.ano);

    // Click the search button
    await Promise.all([
      page.click('input[name="Buscar"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    // Click on the magnifying glass icon of the result
    await Promise.all([
      page.click('img[name="boton_consulta_causa"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    // Extract data from the "Historia" tab
    await page.waitForSelector('#tab_detalle_causa > ul > li:nth-child(2) > a');
    await page.click('#tab_detalle_causa > ul > li:nth-child(2) > a');

    // Extract the last 3 entries from the "Historia" tab
    const historyEntries: HistoryEntry[] = [];
    const historyTableRows = await page.$$('table#tabla_historial > tbody > tr');

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
      }
    }

    // Extract data from the "Escritos por Resolver" tab
    await page.waitForSelector('#tab_detalle_causa > ul > li:nth-child(3) > a');
    await page.click('#tab_detalle_causa > ul > li:nth-child(3) > a');

    const unresolvedWritings: UnresolvedWriting[] = [];
    // check if the element exists
    const element = await page.$('#contenedor_escritos_resolver > div > p');
    if (element) {
      const text = await element.evaluate(node => node.textContent?.trim() || '');
      unresolvedWritings.push({ content: text });
    }
    return {
      history: historyEntries,
      unresolvedWritings: unresolvedWritings,
    };

  } catch (error: any) {
    console.error('Scraping failed:', error);
    throw new Error(error.message || 'Failed to scrape data from PJUD website');
  } finally {
    await browser.close();
  }
}
