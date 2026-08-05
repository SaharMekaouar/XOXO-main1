import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiClient {
  final http.Client client;

  ApiClient(this.client);

  // api_client.dart
Future<http.Response> post(String url, {Map<String, dynamic>? body}) async {
  return client.post(
    Uri.parse(url),
    body: jsonEncode(body), // Ajouter l'encodage JSON
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json', // Ajouter Accept header
    },
  );
}
}