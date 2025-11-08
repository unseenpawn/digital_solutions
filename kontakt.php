<?php
header('Content-Type: application/json; charset=utf-8');
header('Referrer-Policy: no-referrer-when-downgrade');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');

$response = [
    'success' => false,
    'message' => 'Unbekannter Fehler.'
];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response['message'] = 'Method not allowed.';
    echo json_encode($response);
    exit;
}

$body = filter_input_array(INPUT_POST, [
    'name' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'email' => FILTER_SANITIZE_EMAIL,
    'phone' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'company' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'budget' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'message' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'privacy' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'website' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'timestamp' => FILTER_SANITIZE_NUMBER_INT,
]);

if (!$body) {
    http_response_code(400);
    $response['message'] = 'Ungültige Anfrage.';
    echo json_encode($response);
    exit;
}

$honeypot = $body['website'] ?? '';
if (!empty($honeypot)) {
    http_response_code(200);
    $response['message'] = 'Danke!';
    echo json_encode($response);
    exit;
}

$timestamp = (int)($body['timestamp'] ?? 0);
if ($timestamp === 0 || (time() - $timestamp) < 3) {
    http_response_code(429);
    $response['message'] = 'Bitte erneut versuchen.';
    echo json_encode($response);
    exit;
}

$name = trim($body['name'] ?? '');
$email = trim($body['email'] ?? '');
$phone = trim($body['phone'] ?? '');
$company = trim($body['company'] ?? '');
$budget = trim($body['budget'] ?? '');
$message = trim($body['message'] ?? '');
$privacy = isset($body['privacy']);

if ($name === '' || mb_strlen($name) < 2) {
    http_response_code(422);
    $response['message'] = 'Bitte Namen prüfen.';
    echo json_encode($response);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    $response['message'] = 'Bitte E-Mail prüfen.';
    echo json_encode($response);
    exit;
}

if ($company === '' || mb_strlen($company) < 2) {
    http_response_code(422);
    $response['message'] = 'Bitte Firma angeben.';
    echo json_encode($response);
    exit;
}

$allowedBudgets = ['bis-10k', '10-30k', '30-60k', '60plus'];
if (!in_array($budget, $allowedBudgets, true)) {
    http_response_code(422);
    $response['message'] = 'Bitte Budget wählen.';
    echo json_encode($response);
    exit;
}

if ($message === '' || mb_strlen($message) < 20) {
    http_response_code(422);
    $response['message'] = 'Bitte Nachricht präzisieren.';
    echo json_encode($response);
    exit;
}

if (!$privacy) {
    http_response_code(422);
    $response['message'] = 'Bitte Datenschutz bestätigen.';
    echo json_encode($response);
    exit;
}

$subject = 'Neue Anfrage über die Website';
$recipient = 'hallo@example.com';

$lines = [
    'Name: ' . $name,
    'E-Mail: ' . $email,
    'Telefon: ' . ($phone ?: 'Nicht angegeben'),
    'Firma: ' . $company,
    'Budget: ' . $budget,
    'Nachricht:',
    $message
];

$bodyText = implode("\n", $lines);
$headers = [
    'From: ' . $recipient,
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . PHP_VERSION,
    'Content-Type: text/plain; charset=UTF-8'
];

$sent = @mail($recipient, $subject, $bodyText, implode("\r\n", $headers));

if ($sent) {
    $response['success'] = true;
    $response['message'] = 'Danke für Ihre Anfrage. Wir melden uns in Kürze.';
    echo json_encode($response);
    exit;
}

http_response_code(500);
$response['message'] = 'Versand leider fehlgeschlagen. Bitte später erneut versuchen oder E-Mail senden.';
echo json_encode($response);
