/**
 * Hook de React para descargar presupuestos como PDF
 * Funciona con o sin html2pdf.js instalado
 */

'use client';

// Extender tipos globales para html2pdf
declare global {
  interface Window {
    html2pdf?: () => any;
  }
}

export function usePresupuestoPDF() {
  /**
   * Descarga un presupuesto como PDF usando html2pdf o mediante impresión del navegador
   */
  const descargarPresupuestoPDF = async (
    presupuestoId: number,
    token: string,
    nombreArchivo: string = 'presupuesto'
  ): Promise<void> => {
    try {
      // Obtener el HTML del presupuesto desde el servidor
      const response = await fetch(
        `http://localhost:5000/api/pdf/presupuesto/${presupuestoId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener presupuesto');
      }

      const data = await response.json();
      
      if (!data.html) {
        throw new Error('No se pudo generar el documento');
      }

      // Intentar usar html2pdf si está disponible
      if (typeof window !== 'undefined' && (window as any).html2pdf) {
        try {
          const element = document.createElement('div');
          element.innerHTML = data.html;

          const opciones = {
            margin: 10,
            filename: `${nombreArchivo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
          };

          (window as any).html2pdf().set(opciones).from(element).save();
          return;
        } catch (error) {
          console.warn('Error usando html2pdf, usando alternativa:', error);
        }
      }

      // Alternativa: abrir en nueva ventana para que el usuario guarde como PDF
      abrirEnVentanaParaDescargar(data.html, nombreArchivo);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('Error al descargar el presupuesto');
    }
  };

  /**
   * Abre el HTML en una nueva ventana para que el usuario pueda guardar como PDF
   */
  const abrirEnVentanaParaDescargar = (html: string, nombreArchivo: string): void => {
    const ventana = window.open('', '', 'height=600,width=900');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
      
      // Dar tiempo a que cargue el contenido
      setTimeout(() => {
        ventana.focus();
        // Mostrar diálogo de guardar como PDF
        ventana.print();
      }, 100);
    }
  };

  /**
   * Abre el HTML del presupuesto en una nueva ventana para imprimir
   */
  const abrirPresupuestoParaImprimir = async (
    presupuestoId: number,
    token: string
  ): Promise<void> => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/pdf/presupuesto/${presupuestoId}/html`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener presupuesto');
      }

      const html = await response.text();
      
      const ventana = window.open('', '', 'height=600,width=900');
      if (ventana) {
        ventana.document.write(html);
        ventana.document.close();
        
        // Dar tiempo a que cargue antes de imprimir
        setTimeout(() => {
          ventana.focus();
          ventana.print();
        }, 500);
      } else {
        throw new Error('No se pudo abrir la ventana');
      }
    } catch (error) {
      console.error('Error abriendo presupuesto:', error);
      alert('Error al abrir el presupuesto. Verifique que tenga permiso para abrir ventanas emergentes.');
    }
  };

  /**
   * Abre una vista previa del presupuesto en una nueva ventana (solo visualización)
   */
  const verPresupuesto = async (
    presupuestoId: number,
    token: string
  ): Promise<void> => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/pdf/presupuesto/${presupuestoId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener presupuesto');
      }

      const data = await response.json();
      
      if (!data.html) {
        throw new Error('No se pudo generar el documento');
      }

      abrirEnVentanaParaDescargar(data.html, 'presupuesto-preview');
    } catch (error) {
      console.error('Error visualizando presupuesto:', error);
      alert('Error al visualizar el presupuesto');
    }
  };

  return {
    descargarPresupuestoPDF,
    abrirPresupuestoParaImprimir,
    verPresupuesto
  };
}
