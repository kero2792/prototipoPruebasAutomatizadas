const express = require('express');
const path = require('path');
const { loginUsuario, insertarUsuario, insertarLibro, obtenerLibros, actualizarLibro, eliminarLibro } = require('../database/conexion');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/crearCuenta.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'crearCuenta.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email y contraseña son requeridos'
        });
    }

    loginUsuario(email, password, true, (err, user) => {
        if (res.headersSent) return;

        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }

        if (user) {
            return res.json({ success: true });
        } else {
            return res.json({
                success: false,
                message: 'Usuario no encontrado o credenciales incorrectas.'
            });
        }
    });
});

app.post('/crear-cuenta', (req, res) => {
    const { nombre, apellido, telefono, correoelectronico, contrasena } = req.body;

    if (!nombre || !apellido || !telefono || !correoelectronico || !contrasena) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son requeridos'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoelectronico)) {
        return res.status(400).json({
            success: false,
            message: 'El formato del correo electrónico no es válido'
        });
    }

    const telefonoNum = parseInt(telefono);
    if (isNaN(telefonoNum)) {
        return res.status(400).json({
            success: false,
            message: 'El teléfono debe ser un número válido'
        });
    }

    insertarUsuario(nombre, apellido, telefonoNum, correoelectronico, contrasena, (err, result) => {
        if (res.headersSent) return;

        if (err) {
            if (err.message && err.message.includes('UNIQUE KEY constraint')) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un usuario con ese correo electrónico'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Error en el servidor al crear la cuenta'
            });
        }

        return res.json({
            success: true,
            message: 'Cuenta creada exitosamente'
        });
    });
});

app.get('/libros', (req, res) => {
    obtenerLibros((err, libros) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error al obtener los libros'
            });
        }

        return res.json({
            success: true,
            data: libros
        });
    });
});

function validarDatosLibro(req, res, next) {
    const { titulo, autor, anio_publicacion, precio, stock } = req.body;

    if (!titulo || !autor) {
        return res.status(400).json({
            success: false,
            message: 'Título y autor son campos requeridos'
        });
    }

    if (titulo.trim().length === 0 || autor.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Título y autor no pueden estar vacíos'
        });
    }

    if (anio_publicacion && (anio_publicacion < 1000 || anio_publicacion > new Date().getFullYear())) {
        return res.status(400).json({
            success: false,
            message: 'Año de publicación no válido'
        });
    }

    if (precio && precio < 0) {
        return res.status(400).json({
            success: false,
            message: 'El precio no puede ser negativo'
        });
    }

    if (stock && stock < 0) {
        return res.status(400).json({
            success: false,
            message: 'El stock no puede ser negativo'
        });
    }

    next();
}

app.post('/insertar-libro', validarDatosLibro, (req, res) => {
    const { titulo, autor, editorial, anio_publicacion, isbn, precio, stock } = req.body;

    insertarLibro(titulo, autor, editorial, anio_publicacion, isbn, precio, stock, (err, result) => {
        if (res.headersSent) return;

        if (err) {
            if (err.message && err.message.includes('UNIQUE')) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un libro con ese ISBN'
                });
            }

            if (err.message && err.message.includes('constraint')) {
                return res.status(400).json({
                    success: false,
                    message: 'Error de validación en los datos del libro'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Error en el servidor al insertar el libro'
            });
        }

        return res.json({
            success: true,
            message: 'Libro insertado exitosamente',
            data: result
        });
    });
});

app.put('/actualizar-libro/:id', validarDatosLibro, (req, res) => {
    const id = parseInt(req.params.id);

    if (!req.params.id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de libro no válido'
        });
    }

    const { titulo, autor, editorial, anio_publicacion, isbn, precio, stock } = req.body;

    actualizarLibro(id, titulo, autor, editorial, anio_publicacion, isbn, precio, stock, (err, result) => {
        if (res.headersSent) return;

        if (err) {
            if (err.message && err.message.includes('No se encontró el libro')) {
                return res.status(404).json({
                    success: false,
                    message: 'Libro no encontrado'
                });
            }

            if (err.message && err.message.includes('UNIQUE')) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un libro con ese ISBN'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Error en el servidor al actualizar el libro'
            });
        }

        return res.json({
            success: true,
            message: 'Libro actualizado exitosamente',
            data: result
        });
    });
});

app.delete('/eliminar-libro/:id', (req, res) => {
    const id = parseInt(req.params.id);

    if (!req.params.id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de libro no válido'
        });
    }

    eliminarLibro(id, (err, result) => {
        if (res.headersSent) return;

        if (err) {
            if (err.message && err.message.includes('No se encontró el libro')) {
                return res.status(404).json({
                    success: false,
                    message: 'Libro no encontrado o ya está eliminado'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Error en el servidor al eliminar el libro'
            });
        }

        return res.json({
            success: true,
            message: 'Libro eliminado exitosamente',
            data: result
        });
    });
});

app.use((err, req, res, next) => {
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});