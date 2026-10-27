const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const enviarCorreoRecuperacion = async (correo, enlace) => {
    await transporter.sendMail({
        from: `"MercadoClick" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: "Recuperación de contraseña - MercadoClick",

        html: `
            <h2>Recuperación de contraseña</h2>

            <p>
                Hemos recibido una solicitud para restablecer
                la contraseña de tu cuenta de MercadoClick.
            </p>

            <p>
                Haz clic en el siguiente enlace para crear una nueva contraseña:
            </p>

            <a href="${enlace}">
                Restablecer contraseña
            </a>

            <p>
                Este enlace será válido durante 30 minutos.
            </p>

            <p>
                Si no solicitaste este cambio, puedes ignorar este correo.
            </p>
        `
    });
};

module.exports = enviarCorreoRecuperacion;
