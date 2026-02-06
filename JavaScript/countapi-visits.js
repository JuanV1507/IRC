// countapi-visits.js - Versión SIMPLE y FUNCIONAL

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando contador CountAPI...');
    
    // Configuración SIMPLE
    const config = {
        namespace: 'ircdebtrecovery',
        key: 'visitas-totales',
        offset: 1250  // Cambia este número si quieres
    };
    
    // Elementos del DOM
    const totalElement = document.getElementById('total-visits');
    const todayElement = document.getElementById('today-visits');
    const uniqueElement = document.getElementById('unique-visits');
    
    if (!totalElement) {
        console.error('❌ No se encontró el elemento total-visits');
        return;
    }
    
    // Función para mostrar números
    function mostrarNumero(elemento, valor) {
        if (elemento) {
            elemento.textContent = valor.toLocaleString('es-MX');
        }
    }
    
    // Función principal
    async function iniciarContador() {
        try {
            // 1. Obtener valor actual de CountAPI
            const getUrl = `https://api.countapi.xyz/get/${config.namespace}/${config.key}`;
            const getResponse = await fetch(getUrl);
            const getData = await getResponse.json();
            
            const valorReal = getData.value || 0;
            const valorMostrado = valorReal + config.offset;
            
            // 2. Mostrar valor inicial (con offset)
            mostrarNumero(totalElement, valorMostrado);
            
            // 3. Incrementar la visita
            const hitUrl = `https://api.countapi.xyz/hit/${config.namespace}/${config.key}`;
            const hitResponse = await fetch(hitUrl);
            const hitData = await hitResponse.json();
            
            const nuevoValorReal = hitData.value || 0;
            const nuevoValorMostrado = nuevoValorReal + config.offset;
            
            // 4. Mostrar nuevo valor (con animación)
            setTimeout(() => {
                mostrarNumero(totalElement, nuevoValorMostrado);
                console.log(`✅ Visita registrada: ${valorMostrado} → ${nuevoValorMostrado}`);
            }, 500);
            
            // 5. Para hoy y únicos (opcional - valores de ejemplo)
            if (todayElement) {
                const hoy = Math.floor(Math.random() * 20) + 5;
                mostrarNumero(todayElement, hoy);
            }
            
            if (uniqueElement) {
                const unicos = Math.floor(nuevoValorMostrado * 0.7);
                mostrarNumero(uniqueElement, unicos);
            }
            
        } catch (error) {
            console.error('❌ Error con CountAPI:', error);
            
            // Fallback: Mostrar offset + número aleatorio
            const fallback = config.offset + Math.floor(Math.random() * 50);
            mostrarNumero(totalElement, fallback);
            
            if (todayElement) mostrarNumero(todayElement, 15);
            if (uniqueElement) mostrarNumero(uniqueElement, Math.floor(fallback * 0.7));
        }
    }
    
    // Iniciar después de un pequeño delay
    setTimeout(iniciarContador, 1000);
});