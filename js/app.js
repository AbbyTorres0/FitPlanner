// Aplicación principal de FitPlanner - Versión corregida
const FitPlanner = {
    currentSection: 'home',
    editingId: null,
    currentMonth: new Date(),
    
    // Inicializar la aplicación
    init: function() {
        this.bindEvents();
        this.loadRoutines();
        this.initCalendar();
        this.loadHistory();
        Notifications.initReminders();
        
        // Mostrar la sección inicial basada en el hash de la URL
        const hash = window.location.hash.substring(1);
        if (hash && ['home', 'rutinas', 'calendario', 'historial'].includes(hash)) {
            this.showSection(hash);
        } else {
            this.showSection('home');
        }
    },
    
    // Vincular eventos
    bindEvents: function() {
        // Navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });
        
        // Formulario de rutina
        document.getElementById('routineForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRoutine();
        });
        
        // Toggle de recordatorio
        document.getElementById('hasReminder').addEventListener('change', (e) => {
            document.getElementById('reminderTimeContainer').style.display = 
                e.target.checked ? 'block' : 'none';
        });
        
        // Filtros y búsqueda
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterRoutines();
        });
        
        document.getElementById('filterType').addEventListener('change', () => {
            this.filterRoutines();
        });
        
        document.getElementById('filterLevel').addEventListener('change', () => {
            this.filterRoutines();
        });
        
        // Navegación del calendario
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.renderCalendar();
        });
        
        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.renderCalendar();
        });
        
        // Modal events
        const routineModal = document.getElementById('routineModal');
        routineModal.addEventListener('show.bs.modal', () => {
            document.getElementById('reminderTimeContainer').style.display = 
                document.getElementById('hasReminder').checked ? 'block' : 'none';
        });
        
        routineModal.addEventListener('hidden.bs.modal', () => {
            this.editingId = null;
            document.getElementById('routineForm').reset();
            document.getElementById('modalTitle').textContent = 'Agregar Nueva Rutina';
        });
    },
    
    // Mostrar sección
    showSection: function(section) {
        // Ocultar todas las secciones
        document.querySelectorAll('.page-section').forEach(sec => {
            sec.classList.add('d-none');
        });
        
        // Mostrar la sección seleccionada
        document.getElementById(section).classList.remove('d-none');
        
        // Actualizar navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelector(`.nav-link[href="#${section}"]`).classList.add('active');
        
        // Actualizar URL
        window.location.hash = section;
        this.currentSection = section;
        
        // Cargar datos específicos de la sección
        if (section === 'rutinas') {
            this.loadRoutines();
        } else if (section === 'calendario') {
            this.renderCalendar();
            this.loadRoutineListForCalendar(); // Añadido para actualizar la lista
        } else if (section === 'historial') {
            this.loadHistory();
        }
    },
    
    // Cargar rutinas en la tabla
    loadRoutines: function() {
        const routines = Storage.getRoutines();
        const tbody = document.getElementById('routinesTable').querySelector('tbody');
        tbody.innerHTML = '';
        
        if (routines.length === 0) {
            document.getElementById('noRoutinesMessage').classList.remove('d-none');
            document.getElementById('routinesTable').classList.add('d-none');
            return;
        }
        
        document.getElementById('noRoutinesMessage').classList.add('d-none');
        document.getElementById('routinesTable').classList.remove('d-none');
        
        routines.forEach(routine => {
            const row = document.createElement('tr');
            
            // Formatear días
            const daysText = routine.days === 1 ? '1 día' : `${routine.days} días`;
            
            // Formatear recordatorio
            const reminderText = routine.hasReminder && routine.reminderTime ? 
                `⏰ ${routine.reminderTime}` : 'Sin recordatorio';
            
            row.innerHTML = `
                <td>${routine.name}</td>
                <td><span class="badge bg-primary">${this.formatType(routine.type)}</span></td>
                <td>${routine.duration} min</td>
                <td><span class="badge ${this.getLevelBadgeClass(routine.level)}">${this.formatLevel(routine.level)}</span></td>
                <td>${daysText}</td>
                <td>${reminderText}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="FitPlanner.editRoutine('${routine.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger me-1" onclick="FitPlanner.deleteRoutine('${routine.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="FitPlanner.completeRoutine('${routine.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    },
    
    // Filtrar rutinas
    filterRoutines: function() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const typeFilter = document.getElementById('filterType').value;
        const levelFilter = document.getElementById('filterLevel').value;
        
        const rows = document.getElementById('routinesTable').querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const name = row.cells[0].textContent.toLowerCase();
            const type = row.cells[1].textContent.toLowerCase();
            const level = row.cells[3].textContent.toLowerCase();
            
            const matchesSearch = name.includes(searchTerm);
            const matchesType = !typeFilter || type.includes(typeFilter);
            const matchesLevel = !levelFilter || level.includes(levelFilter);
            
            row.style.display = (matchesSearch && matchesType && matchesLevel) ? '' : 'none';
        });
    },
    
    // Limpiar filtros
    clearFilters: function() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterLevel').value = '';
        this.filterRoutines();
    },
    
    // Guardar rutina (crear o editar)
    saveRoutine: function() {
        const form = document.getElementById('routineForm');
        
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        this.showLoading(true);
        
        const routine = {
            id: this.editingId || Storage.generateId(),
            name: document.getElementById('name').value,
            type: document.getElementById('type').value,
            duration: parseInt(document.getElementById('duration').value),
            level: document.getElementById('level').value,
            days: parseInt(document.getElementById('days').value),
            description: document.getElementById('description').value,
            hasReminder: document.getElementById('hasReminder').checked,
            reminderTime: document.getElementById('hasReminder').checked ? 
                document.getElementById('reminderTime').value : null,
            createdAt: this.editingId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const routines = Storage.getRoutines();
        
        if (this.editingId) {
            // Editar rutina existente
            const index = routines.findIndex(r => r.id === this.editingId);
            if (index !== -1) {
                // Mantener la fecha de creación original
                routine.createdAt = routines[index].createdAt;
                routines[index] = routine;
            }
        } else {
            // Agregar nueva rutina
            routines.push(routine);
        }
        
        Storage.saveRoutines(routines);
        
        // Programar recordatorio si es necesario
        if (routine.hasReminder && routine.reminderTime) {
            Notifications.scheduleReminder(routine);
        }
        
        // Cerrar modal y recargar
        bootstrap.Modal.getInstance(document.getElementById('routineModal')).hide();
        this.loadRoutines();
        
        // Actualizar la lista de rutinas en el calendario
        this.loadRoutineListForCalendar();
        
        this.showLoading(false);
        
        // Mostrar mensaje de éxito
        this.showAlert(
            this.editingId ? 'Rutina actualizada correctamente' : 'Rutina creada correctamente', 
            'success'
        );
    },
    
    // Editar rutina
    editRoutine: function(id) {
        const routines = Storage.getRoutines();
        const routine = routines.find(r => r.id === id);
        
        if (!routine) return;
        
        this.editingId = id;
        
        // Llenar el formulario
        document.getElementById('name').value = routine.name;
        document.getElementById('type').value = routine.type;
        document.getElementById('duration').value = routine.duration;
        document.getElementById('level').value = routine.level;
        document.getElementById('days').value = routine.days;
        document.getElementById('description').value = routine.description || '';
        document.getElementById('hasReminder').checked = routine.hasReminder || false;
        document.getElementById('reminderTime').value = routine.reminderTime || '';
        
        document.getElementById('modalTitle').textContent = 'Editar Rutina';
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('routineModal'));
        modal.show();
    },
    
    // Eliminar rutina
    deleteRoutine: function(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta rutina?')) return;
        
        this.showLoading(true);
        
        const routines = Storage.getRoutines();
        const filtered = routines.filter(r => r.id !== id);
        
        Storage.saveRoutines(filtered);
        this.loadRoutines();
        
        // Actualizar la lista de rutinas en el calendario
        this.loadRoutineListForCalendar();
        
        this.showLoading(false);
        this.showAlert('Rutina eliminada correctamente', 'success');
    },
    
    // Marcar rutina como completada
    completeRoutine: function(id) {
        this.showLoading(true);
        
        const routines = Storage.getRoutines();
        const routine = routines.find(r => r.id === id);
        
        if (!routine) return;
        
        const completed = Storage.getCompletedRoutines();
        completed.push({
            ...routine,
            completedAt: new Date().toISOString()
        });
        
        Storage.saveCompletedRoutines(completed);
        
        this.showLoading(false);
        this.showAlert('¡Rutina completada! Buen trabajo.', 'success');
    },
    
    // Inicializar calendario
    initCalendar: function() {
        this.renderCalendar();
        this.loadRoutineListForCalendar();
    },
    
    // Renderizar calendario
    renderCalendar: function() {
        const calendarEl = document.getElementById('calendar');
        const monthYearEl = document.getElementById('currentMonth');
        
        // Actualizar título del mes
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        monthYearEl.textContent = `${monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
        
        // Obtener primer día del mes y cantidad de días
        const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const lastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Obtener el día de la semana del primer día (0 = Domingo, 1 = Lunes, etc.)
        let firstDayIndex = firstDay.getDay();
        // Ajustar para que la semana comience el lunes
        firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
        
        // Generar días de la semana header
        const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        let calendarHTML = '';
        
        // Crear encabezados de días
        for (let i = 0; i < 7; i++) {
            calendarHTML += `<div class="calendar-day-header text-center fw-bold">${dayNames[i]}</div>`;
        }
        
        // Crear celdas vacías para los días antes del primer día del mes
        for (let i = 0; i < firstDayIndex; i++) {
            calendarHTML += `<div class="calendar-day"></div>`;
        }
        
        // Obtener rutinas programadas para el mes
        const calendarData = Storage.getCalendar();
        const monthKey = `${this.currentMonth.getFullYear()}-${this.currentMonth.getMonth() + 1}`;
        const monthRoutines = calendarData[monthKey] || {};
        
        // Crear celdas para cada día del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dayKey = `${monthKey}-${day}`;
            const dayRoutines = monthRoutines[day] || [];
            
            let dayHTML = `
                <div class="day-header">${day}</div>
                <div class="day-routines">
            `;
            
            dayRoutines.forEach(routineId => {
                const routines = Storage.getRoutines();
                const routine = routines.find(r => r.id === routineId);
                
                if (routine) {
                    dayHTML += `<span class="routine-badge">${routine.name}</span>`;
                }
            });
            
            dayHTML += `</div>`;
            
            calendarHTML += `
                <div class="calendar-day" ondragover="event.preventDefault()" ondrop="FitPlanner.dropRoutine(event, '${day}')">
                    ${dayHTML}
                </div>
            `;
        }
        
        calendarEl.innerHTML = calendarHTML;
        
        // Hacer que los días sean arrastrables
        document.querySelectorAll('.routine-list-item').forEach(item => {
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', this.dragRoutine);
        });
    },
    
    // Cargar lista de rutinas para el calendario
    loadRoutineListForCalendar: function() {
        const routines = Storage.getRoutines();
        const listEl = document.getElementById('routineListCalendar');
        listEl.innerHTML = '';
        
        if (routines.length === 0) {
            listEl.innerHTML = '<div class="text-center text-muted p-3">No hay rutinas para mostrar</div>';
            return;
        }
        
        routines.forEach(routine => {
            const item = document.createElement('div');
            item.className = 'list-group-item routine-list-item';
            item.setAttribute('draggable', 'true');
            item.setAttribute('data-routine-id', routine.id);
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${routine.name}</h6>
                        <small class="text-muted">${this.formatType(routine.type)} · ${routine.duration} min</small>
                    </div>
                    <i class="fas fa-grip-vertical text-muted"></i>
                </div>
            `;
            
            item.addEventListener('dragstart', this.dragRoutine);
            listEl.appendChild(item);
        });
    },
    
    // Arrastrar rutina
    dragRoutine: function(e) {
        const routineId = e.target.getAttribute('data-routine-id');
        e.dataTransfer.setData('text/plain', routineId);
    },
    
    // Soltar rutina en el calendario
    dropRoutine: function(e, day) {
        e.preventDefault();
        const routineId = e.dataTransfer.getData('text/plain');
        
        if (!routineId) return;
        
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        const monthKey = `${year}-${month}`;
        const dayNum = parseInt(day);
        
        // Obtener datos actuales del calendario
        const calendarData = Storage.getCalendar();
        
        // Inicializar mes si no existe
        if (!calendarData[monthKey]) {
            calendarData[monthKey] = {};
        }
        
        // Inicializar día si no existe
        if (!calendarData[monthKey][dayNum]) {
            calendarData[monthKey][dayNum] = [];
        }
        
        // Agregar rutina si no está ya programada
        if (!calendarData[monthKey][dayNum].includes(routineId)) {
            calendarData[monthKey][dayNum].push(routineId);
            Storage.saveCalendar(calendarData);
            
            // Actualizar calendario
            this.renderCalendar();
            this.showAlert('Rutina agregada al calendario', 'success');
        }
    },
    
    // Cargar historial
    loadHistory: function() {
        const completed = Storage.getCompletedRoutines();
        
        // Actualizar contador
        document.getElementById('completedCount').textContent = completed.length;
        
        // Actualizar rutinas recientes
        const recentList = document.getElementById('recentRoutines');
        recentList.innerHTML = '';
        
        const recent = completed.slice(-5).reverse();
        
        if (recent.length === 0) {
            recentList.innerHTML = '<li class="list-group-item text-center text-muted">No hay rutinas completadas recientemente</li>';
        } else {
            recent.forEach(routine => {
                const item = document.createElement('li');
                item.className = 'list-group-item';
                
                const date = new Date(routine.completedAt);
                const formattedDate = date.toLocaleDateString();
                
                item.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${routine.name}</h6>
                            <small class="text-muted">${formattedDate}</small>
                        </div>
                        <span class="badge ${this.getLevelBadgeClass(routine.level)}">${this.formatLevel(routine.level)}</span>
                    </div>
                `;
                
                recentList.appendChild(item);
            });
        }
        
        // Actualizar tabla completa
        const completedTable = document.getElementById('completedTable').querySelector('tbody');
        completedTable.innerHTML = '';
        
        if (completed.length === 0) {
            completedTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">No hay rutinas completadas</td>
                </tr>
            `;
        } else {
            completed.reverse().forEach(routine => {
                const date = new Date(routine.completedAt);
                const formattedDate = date.toLocaleDateString();
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${routine.name}</td>
                    <td>${this.formatType(routine.type)}</td>
                    <td>${routine.duration} min</td>
                    <td><span class="badge ${this.getLevelBadgeClass(routine.level)}">${this.formatLevel(routine.level)}</span></td>
                `;
                
                completedTable.appendChild(row);
            });
        }
        
        // Renderizar gráfico
        this.renderTypeChart(completed);
    },
    
    // Renderizar gráfico de tipos
    renderTypeChart: function(completedRoutines) {
        const ctx = document.getElementById('typeChart').getContext('2d');
        
        // Contar rutinas por tipo
        const typeCount = {
            cardio: 0,
            fuerza: 0,
            flexibilidad: 0,
            equilibrio: 0
        };
        
        completedRoutines.forEach(routine => {
            if (typeCount.hasOwnProperty(routine.type)) {
                typeCount[routine.type]++;
            }
        });
        
        // Crear gráfico
        if (window.typeChartInstance) {
            window.typeChartInstance.destroy();
        }
        
        window.typeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Cardio', 'Fuerza', 'Flexibilidad', 'Equilibrio'],
                datasets: [{
                    data: [typeCount.cardio, typeCount.fuerza, typeCount.flexibilidad, typeCount.equilibrio],
                    backgroundColor: [
                        '#4361ee',
                        '#3a0ca3',
                        '#4cc9f0',
                        '#4895ef'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },
    
    // Mostrar/Ocultar loading
    showLoading: function(show) {
        document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
    },
    
    // Mostrar alerta
    showAlert: function(message, type) {
        // Crear elemento de alerta
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.style.minWidth = '300px';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 3000);
    },
    
    // Utilidades de formato
    formatType: function(type) {
        const types = {
            'cardio': 'Cardio',
            'fuerza': 'Fuerza',
            'flexibilidad': 'Flexibilidad',
            'equilibrio': 'Equilibrio'
        };
        
        return types[type] || type;
    },
    
    formatLevel: function(level) {
        const levels = {
            'principiante': 'Principiante',
            'intermedio': 'Intermedio',
            'avanzado': 'Avanzado'
        };
        
        return levels[level] || level;
    },
    
    getLevelBadgeClass: function(level) {
        const classes = {
            'principiante': 'bg-success',
            'intermedio': 'bg-warning',
            'avanzado': 'bg-danger'
        };
        
        return classes[level] || 'bg-secondary';
    }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    FitPlanner.init();
});