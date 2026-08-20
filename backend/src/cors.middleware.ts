import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://your-production-domain.com'] // Remplacez par votre domaine de production
      : ['http://localhost:4200', 'http://localhost:8100']; // Origines autorisées pour le développement (Angular et Ionic)

    const origin = req.headers.origin;
    
    // Vérification si l'origine de la requête est dans les origines autorisées
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin); // Répond uniquement à l'origine autorisée
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*'); // Ou utiliser '*' si vous souhaitez permettre l'accès à n'importe quelle origine
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Permet l'utilisation de cookies avec les requêtes CORS

    if (req.method === 'OPTIONS') {
      return res.status(204).end(); // Si la méthode est OPTIONS, renvoyer une réponse vide pour la pré-vérification CORS
    }

    next();
  }
}
