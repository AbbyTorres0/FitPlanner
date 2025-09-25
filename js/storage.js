// Manejo del almacenamiento local
const Storage = {
    // Obtener todas las rutinas
    getRoutines: () => {
        const routines = localStorage.getItem('fitplanner_routines');
        return routines ? JSON.parse(routines) : [];
    },
    
    // Guardar rutinas
    saveRoutines: (routines) => {
        localStorage.setItem('fitplanner_routines', JSON.stringify(routines));
    },
    
    // Obtener rutinas completadas
    getCompletedRoutines: () => {
        const completed = localStorage.getItem('fitplanner_completed');
        return completed ? JSON.parse(completed) : [];
    },
    
    // Guardar rutinas completadas
    saveCompletedRoutines: (completed) => {
        localStorage.setItem('fitplanner_completed', JSON.stringify(completed));
    },
    
    // Obtener calendario
    getCalendar: () => {
        const calendar = localStorage.getItem('fitplanner_calendar');
        return calendar ? JSON.parse(calendar) : {};
    },
    
    // Guardar calendario
    saveCalendar: (calendar) => {
        localStorage.setItem('fitplanner_calendar', JSON.stringify(calendar));
    },
    
    // Generar ID único
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};