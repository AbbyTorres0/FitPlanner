// Manejo de notificaciones
const Notifications = {
    // Solicitar permiso para notificaciones
    requestPermission: () => {
        if (!("Notification" in window)) {
            console.log("Este navegador no soporta notificaciones");
            return false;
        }
        
        if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Permiso para notificaciones concedido");
                }
            });
        }
        
        return Notification.permission === "granted";
    },
    
    // Crear una notificación
    create: (title, options = {}) => {
        if (!("Notification" in window)) return;
        
        if (Notification.permission === "granted") {
            const notification = new Notification(title, {
                icon: '/assets/fitplanner-icon.png',
                badge: '/assets/fitplanner-badge.png',
                ...options
            });
            
            // Cerrar automáticamente después de 5 segundos
            setTimeout(() => {
                notification.close();
            }, 5000);
            
            return notification;
        }
    },
    
    // Programar recordatorio
    scheduleReminder: (routine) => {
        if (!routine.hasReminder || !routine.reminderTime) return;
        
        // Calcular el tiempo para el recordatorio
        const [hours, minutes] = routine.reminderTime.split(':');
        const now = new Date();
        const reminderTime = new Date();
        
        reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Si la hora ya pasó hoy, programar para mañana
        if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
        }
        
        const timeUntilReminder = reminderTime - now;
        
        // Programar la notificación
        setTimeout(() => {
            Notifications.create('Recordatorio de FitPlanner', {
                body: `Es hora de tu rutina: ${routine.name}`,
                tag: `reminder-${routine.id}`
            });
            
            // Programar el próximo recordatorio (diario)
            Notifications.scheduleReminder(routine);
        }, timeUntilReminder);
    },
    
    // Inicializar todos los recordatorios
    initReminders: () => {
        const routines = Storage.getRoutines();
        
        routines.forEach(routine => {
            if (routine.hasReminder && routine.reminderTime) {
                Notifications.scheduleReminder(routine);
            }
        });
    }
};

// Solicitar permiso al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    Notifications.requestPermission();
});