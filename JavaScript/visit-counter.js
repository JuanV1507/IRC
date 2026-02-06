// visit-counter.js - Contador con CountAPI + OFFSETS

//  CONFIGURACIÓN 
const CONFIG = {
    namespace: 'ircdebtrecovery',      
    keyTotal: 'visitas-totales',
    keyToday: 'visitas-hoy',
    keyUnique: 'visitas-unicas',
    
    // NUEVO: OFFSETS PERSONALIZABLES 
    offsets: {
        total: 1250,      
        today: 0,         
        unique: 0         
    },
    
    // Activar/desactivar offsets
    useOffsets: true,     // true = mostrar CountAPI + offset | false = solo CountAPI
    
    // Backup local si falla la API
    useLocalBackup: true
};

// URLs de CountAPI
const API_URLS = {
    hitTotal: `https://api.countapi.xyz/hit/${CONFIG.namespace}/${CONFIG.keyTotal}`,
    getTotal: `https://api.countapi.xyz/get/${CONFIG.namespace}/${CONFIG.keyTotal}`,
    
    hitToday: `https://api.countapi.xyz/hit/${CONFIG.namespace}/${CONFIG.keyToday}`,
    getToday: `https://api.countapi.xyz/get/${CONFIG.namespace}/${CONFIG.keyToday}`,
    
    hitUnique: `https://api.countapi.xyz/hit/${CONFIG.namespace}/${CONFIG.keyUnique}`,
    getUnique: `https://api.countapi.xyz/get/${CONFIG.namespace}/${CONFIG.keyUnique}`
};

// IDs de los elementos en tu footer
const ELEMENT_IDS = {
    totalVisits: 'total-visits',
    todayVisits: 'today-visits',
    uniqueVisits: 'unique-visits',
    monthVisits: 'month-visits',
    lastUpdated: 'last-updated',
    apiStatus: 'api-status',
    debugInfo: 'debug-info'
};

// Estado del contador (solo para referencia interna)
let stats = {
    total: 0,        // Valor REAL de CountAPI
    today: 0,
    unique: 0,
    month: 0
};

// ⬇️ NUEVO: Estado con offsets aplicados
let displayedStats = {
    total: 0,        // Valor MOSTRADO (CountAPI + offset)
    today: 0,
    unique: 0
};

//FUNCIÓN PARA OBTENER DATOS DE COUNTAPI
async function fetchCountAPI(url, isHit = false) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        
        // Verificar si la respuesta es válida
        if (data && typeof data.value !== 'undefined') {
            return data.value;
        } else {
            throw new Error('Respuesta inválida de CountAPI');
        }
    } catch (error) {
        console.error('Error fetching CountAPI:', error);
        
        // Usar backup local si está configurado
        if (CONFIG.useLocalBackup) {
            const backupKey = isHit ? 'hit' : 'get';
            const localValue = localStorage.getItem(`countapi_backup_${backupKey}`);
            return localValue ? parseInt(localValue) : 0;
        }
        
        throw error;
    }
}

// FUNCIÓN PARA APLICAR OFFSETS
function applyOffset(type, apiValue) {
    if (!CONFIG.useOffsets || !CONFIG.offsets[type]) {
        return apiValue; // Sin offset
    }
    
    const offset = CONFIG.offsets[type];
    const valueWithOffset = apiValue + offset;
    
    // Guardar ambos valores para referencia
    stats[type] = apiValue;               // Valor REAL
    displayedStats[type] = valueWithOffset; // Valor MOSTRADO
    
    // Debug info (solo visible en consola)
    if (window.location.search.includes('debug=countapi')) {
        console.log(`📊 ${type.toUpperCase()}: CountAPI=${apiValue} + Offset=${offset} = ${valueWithOffset}`);
    }
    
    return valueWithOffset;
}

// ACTUALIZAR UNA ESTADÍSTICA ESPECÍFICA (MODIFICADA)
async function updateStatistic(type, isIncrement = true) {
    const urls = {
        'total': { hit: API_URLS.hitTotal, get: API_URLS.getTotal },
        'today': { hit: API_URLS.hitToday, get: API_URLS.getToday },
        'unique': { hit: API_URLS.hitUnique, get: API_URLS.getUnique }
    };
    
    if (!urls[type]) return;
    
    try {
        let apiValue;
        
        if (isIncrement) {
            // Incrementar el contador en CountAPI
            apiValue = await fetchCountAPI(urls[type].hit, true);
            
            // Guardar backup local del valor REAL
            localStorage.setItem(`countapi_backup_${type}`, apiValue.toString());
            localStorage.setItem(`countapi_backup_hit`, apiValue.toString());
        } else {
            // Solo obtener el valor actual de CountAPI
            apiValue = await fetchCountAPI(urls[type].get, false);
        }
        
        //  NUEVO: Aplicar offset si está activado
        const displayedValue = applyOffset(type, apiValue);
        
        // Actualizar objeto de estadísticas REALES
        stats[type] = apiValue;
        
        // Actualizar la UI con el valor mostrado (con offset)
        updateStatUI(type, displayedValue);
        
        return displayedValue;
    } catch (error) {
        console.error(`Error updating ${type}:`, error);
        
        // Usar valor local como fallback (con offset aplicado)
        const localValue = localStorage.getItem(`countapi_backup_${type}`);
        const apiValue = localValue ? parseInt(localValue) : 0;
        const displayedValue = applyOffset(type, apiValue);
        
        updateStatUI(type, displayedValue);
        return displayedValue;
    }
}

// ACTUALIZAR INTERFAZ DE USUARIO (MODIFICADA PARA ANIMACIÓN MEJORADA)
function updateStatUI(type, value) {
    const elementId = ELEMENT_IDS[`${type}Visits`] || `${type}-visits`;
    const element = document.getElementById(elementId);
    
    if (element) {
        // Formatear número con separadores de miles
        const formattedValue = value.toLocaleString('es-MX');
        
        // Obtener valor actual del elemento (lo que ya está mostrando)
        const currentText = element.textContent || '0';
        const currentValue = parseInt(currentText.replace(/[^0-9]/g, '')) || 0;
        
        // Solo animar si el valor cambió
        if (currentValue !== value) {
            animateCounter(element, currentValue, value);
        } else {
            // Solo actualizar el texto si no hay animación
            element.textContent = formattedValue;
        }
        
        //  NUEVO: Mostrar tooltip con info real vs mostrada (solo debug)
        if (window.location.search.includes('debug=countapi')) {
            element.title = `Real: ${stats[type].toLocaleString()} | Mostrado: ${value.toLocaleString()} | Offset: ${CONFIG.offsets[type] || 0}`;
        }
    }
}

//  ANIMACIÓN DE CONTEO (MEJORADA)
function animateCounter(element, start, end) {
    // Limpiar animación anterior si existe
    if (element._animationTimer) {
        clearInterval(element._animationTimer);
    }
    
    const duration = 800; // 0.8 segundos
    const steps = 25;
    const increment = (end - start) / steps;
    let current = start;
    let step = 0;
    
    element._animationTimer = setInterval(() => {
        current += increment;
        step++;
        
        if (step >= steps) {
            current = end;
            clearInterval(element._animationTimer);
            delete element._animationTimer;
        }
        
        // Redondear y formatear
        const rounded = Math.round(current);
        element.textContent = rounded.toLocaleString('es-MX');
    }, duration / steps);
}

// ACTUALIZAR MARCA DE TIEMPO
function updateTimestamp() {
    const now = new Date();
    const element = document.getElementById(ELEMENT_IDS.lastUpdated);
    
    if (element) {
        // Formato: "HH:MM:SS"
        const timeString = now.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        element.textContent = timeString;
    }
}

//NICIALIZAR TODAS LAS ESTADÍSTICAS (MODIFICADA)
async function initAllStats() {
    try {
        // Obtener valores actuales de CountAPI (sin incrementar)
        const [totalAPI, todayAPI, uniqueAPI] = await Promise.all([
            fetchCountAPI(API_URLS.getTotal, false),
            fetchCountAPI(API_URLS.getToday, false),
            fetchCountAPI(API_URLS.getUnique, false)
        ]);
        
        // Aplicar offsets a cada valor
        const totalDisplayed = applyOffset('total', totalAPI);
        const todayDisplayed = applyOffset('today', todayAPI);
        const uniqueDisplayed = applyOffset('unique', uniqueAPI);
        
        // Actualizar UI con valores mostrados (con offsets)
        updateStatUI('total', totalDisplayed);
        updateStatUI('today', todayDisplayed);
        updateStatUI('unique', uniqueDisplayed);
        
        // Actualizar estadísticas del mes (simulado con offset)
        const monthElement = document.getElementById(ELEMENT_IDS.monthVisits);
        if (monthElement) {
            // Simular visitas del mes (25% de las totales mostradas)
            const monthValue = Math.floor(totalDisplayed * 0.25);
            stats.month = monthValue;
            monthElement.textContent = monthValue.toLocaleString('es-MX');
        }
        
        updateTimestamp();
        updateAPIStatus('✅ Conectado a CountAPI');
        
        return { 
            total: totalDisplayed, 
            today: todayDisplayed, 
            unique: uniqueDisplayed,
            //  También devolver valores reales para debug
            _real: {
                total: totalAPI,
                today: todayAPI,
                unique: uniqueAPI
            }
        };
    } catch (error) {
        console.error('Error initializing stats:', error);
        updateAPIStatus('⚠️ Usando datos locales');
        
        // Cargar valores de backup con offsets
        loadLocalBackup();
        return displayedStats;
    }
}

// CARGAR BACKUP LOCAL (MODIFICADA)
function loadLocalBackup() {
    const types = ['total', 'today', 'unique'];
    
    types.forEach(type => {
        const localValue = localStorage.getItem(`countapi_backup_${type}`);
        if (localValue) {
            const apiValue = parseInt(localValue);
            const displayedValue = applyOffset(type, apiValue);
            updateStatUI(type, displayedValue);
        }
    });
}

//  ACTUALIZAR ESTADO DE LA API
function updateAPIStatus(message) {
    const statusElement = document.getElementById(ELEMENT_IDS.apiStatus);
    if (statusElement) {
        statusElement.textContent = message;
    }
}

//  REGISTRAR NUEVA VISITA (MODIFICADA PARA OFFSETS)
async function registerVisit() {
    try {
        // Verificar si ya se registró una visita en esta sesión
        const sessionKey = 'irc_visit_registered';
        if (sessionStorage.getItem(sessionKey)) {
            return; // Ya se registró en esta sesión
        }
        
        // Incrementar todas las estadísticas en CountAPI
        // (los offsets se aplican automáticamente en updateStatistic)
        await Promise.all([
            updateStatistic('total', true),
            updateStatistic('today', true),
            updateStatistic('unique', true)
        ]);
        
        // Marcar como visitado en esta sesión
        sessionStorage.setItem(sessionKey, 'true');
        
        // Actualizar timestamp
        updateTimestamp();
        
        //  NUEVO: Debug info
        if (window.location.search.includes('debug=countapi')) {
            console.log('✅ Visita registrada. Stats mostrados:', displayedStats);
        }
        
    } catch (error) {
        console.error('Error registrando visita:', error);
    }
}

//  ACTUALIZAR ESTADÍSTICAS PERIÓDICAMENTE
function startPeriodicUpdates() {
    // Actualizar contador de "hoy" cada 5 minutos (sin incrementar)
    setInterval(async () => {
        try {
            const todayAPI = await fetchCountAPI(API_URLS.getToday, false);
            const todayDisplayed = applyOffset('today', todayAPI);
            updateStatUI('today', todayDisplayed);
            updateTimestamp();
        } catch (error) {
            console.log('Error actualizando contador hoy:', error);
        }
    }, 5 * 60 * 1000); // 5 minutos
    
    // Actualizar marca de tiempo cada 30 segundos
    setInterval(updateTimestamp, 30 * 1000);
}

//  NUEVO: FUNCIÓN PARA ADMINISTRAR OFFSETS
function setupAdminControls() {
    // Solo mostrar controles si está en modo debug
    if (window.location.search.includes('debug=countapi')) {
        const adminDiv = document.createElement('div');
        adminDiv.id = 'countapi-admin';
        adminDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
        `;
        
        adminDiv.innerHTML = `
            <h4 style="margin-top: 0;">Admin CountAPI</h4>
            <div style="margin-bottom: 10px;">
                <label>Offset Total:</label>
                <input type="number" id="offset-total" value="${CONFIG.offsets.total}" style="width: 80px; margin-left: 10px;">
            </div>
            <button onclick="updateOffsets()">Aplicar</button>
            <button onclick="showRealStats()" style="margin-left: 10px;">Ver Reales</button>
        `;
        
        document.body.appendChild(adminDiv);
    }
}

//  NUEVO: ACTUALIZAR OFFSETS EN TIEMPO REAL
window.updateOffsets = function() {
    const totalInput = document.getElementById('offset-total');
    if (totalInput) {
        CONFIG.offsets.total = parseInt(totalInput.value) || 0;
        
        // Re-aplicar offsets a estadísticas actuales
        const types = ['total', 'today', 'unique'];
        types.forEach(type => {
            if (stats[type] !== undefined) {
                const displayedValue = applyOffset(type, stats[type]);
                updateStatUI(type, displayedValue);
            }
        });
        
        alert(`✅ Offsets actualizados. Total ahora: ${CONFIG.offsets.total}`);
    }
};

//  NUEVO: MOSTRAR ESTADÍSTICAS REALES
window.showRealStats = function() {
    console.log('📊 ESTADÍSTICAS REALES:');
    console.log('- Total CountAPI:', stats.total);
    console.log('- Hoy CountAPI:', stats.today);
    console.log('- Únicos CountAPI:', stats.unique);
    console.log('- Offset Total:', CONFIG.offsets.total);
    console.log('- Mostrado Total:', displayedStats.total);
};

//  INICIALIZAR CONTADOR (MODIFICADA)
async function initCounter() {
    console.log('🚀 Inicializando contador de visitas...');
    
    // Mostrar información de debug si está activado
    const debugElement = document.getElementById(ELEMENT_IDS.debugInfo);
    if (debugElement && window.location.search.includes('debug=countapi')) {
        debugElement.style.display = 'block';
        setupAdminControls(); // ⬅️ NUEVO: Agregar controles admin
    }
    
    try {
        // Inicializar estadísticas (offsets se aplican automáticamente)
        await initAllStats();
        
        // Registrar nueva visita (con retardo para evitar bloqueos)
        setTimeout(registerVisit, 1500);
        
        // Iniciar actualizaciones periódicas
        startPeriodicUpdates();
        
        console.log('✅ Contador inicializado correctamente');
        
        //  NUEVO: Mostrar info de offsets en consola
        if (CONFIG.useOffsets) {
            console.log(`🎯 Offsets activados: Total=${CONFIG.offsets.total}`);
        }
        
    } catch (error) {
        console.error('❌ Error inicializando contador:', error);
    }
}

//  EXPORTAR FUNCIONES PARA USO GLOBAL (ACTUALIZADO)
window.IRCVisitCounter = {
    init: initCounter,
    registerVisit: registerVisit,
    getStats: () => displayedStats,     // Devuelve stats CON offset
    getRealStats: () => stats,         //  Devuelve stats REALES
    updateAllStats: initAllStats,
    // Funciones para manejar offsets
    setOffset: function(type, value) {
        if (CONFIG.offsets[type] !== undefined) {
            CONFIG.offsets[type] = value;
            console.log(`Offset ${type} actualizado a ${value}`);
        }
    },
    toggleOffsets: function() {
        CONFIG.useOffsets = !CONFIG.useOffsets;
        console.log(`Offsets ${CONFIG.useOffsets ? 'activados' : 'desactivados'}`);
        initAllStats(); // Recargar stats
    }
};

// AUTO-INICIALIZACIÓN CUANDO EL DOM ESTÉ LISTO
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para no bloquear la carga de la página
    setTimeout(initCounter, 1000);
});

//  NUEVO: EXPORTAR CONFIG PARA ACCESO EXTERNO
window.COUNTAPI_CONFIG = CONFIG;