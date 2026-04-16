'use client';

import { useState } from 'react';

interface IHtml2Pdf {
  set: (options: any) => IHtml2Pdf;
  from: (element: any) => IHtml2Pdf;
  download: (filename: string) => void;
  save: (filename: string) => void;
  output: (type: string) => Blob | string;
}

declare global {
  interface Window {
    html2pdf?: () => any;
  }
}

export function useFacturaPDF() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Descarga una factura como PDF
   */
  const descargarFacturaPDF = async (
    facturaId: string,
    token: string,
    nombreArchivo: string = `factura-${facturaId}.pdf`
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:5000/api/pdf/factura/${facturaId}/html`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener factura: ${response.statusText}`);
      }

      const html = await response.text();

      // Intentar usar html2pdf si está disponible
      if (window.html2pdf) {
        try {
          const element = document.createElement('div');
          element.innerHTML = html;
          
          const options = {
            margin: [10, 10, 10, 10],
            filename: nombreArchivo,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
          };
          
          window.html2pdf!().set(options).from(element).download();
          return;
        } catch (html2PdfError) {
          console.warn('html2pdf error, intentando fallback:', html2PdfError);
        }
      }

      // Fallback: Abrir en nueva ventana
      const ventana = window.open('', '_blank');

      if (ventana) {
        ventana.document.write(html);
        ventana.document.close();

        ventana.onload = function () {
          ventana.focus();
          ventana.print();
        };
      } else {
        throw new Error('No se pudo abrir ventana emergente');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error descargando factura:', err);
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Abre una factura para imprimir
   */
  const abrirFacturaParaImprimir = async (
    facturaId: string,
    token: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:5000/api/pdf/factura/${facturaId}/html`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener factura: ${response.statusText}`);
      }

      const html = await response.text();
      const ventana = window.open('', '_blank');
      
      if (ventana) {
        ventana.document.write(html);
        ventana.document.close();
        setTimeout(() => {
          ventana.print();
        }, 500);
      } else {
        throw new Error('No se pudo abrir ventana emergente');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error abriendo factura para imprimir:', err);
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ver factura solamente
   */
  const verFactura = async (
    facturaId: string,
    token: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:5000/api/pdf/factura/${facturaId}/html`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener factura: ${response.statusText}`);
      }

      const html = await response.text();
      const ventana = window.open('', '_blank');
      
      if (ventana) {
        ventana.document.write(html);
        ventana.document.close();
      } else {
        throw new Error('No se pudo abrir ventana emergente');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error al ver factura:', err);
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    descargarFacturaPDF,
    abrirFacturaParaImprimir,
    verFactura,
    isLoading,
    error
  };
}
