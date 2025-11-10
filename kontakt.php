<?php
declare(strict_types=1);

header('Referrer-Policy: no-referrer-when-downgrade');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');

const CONTACT_TO = 'hallo@digital-solutions.swiss';
const CONTACT_SUBJECT = 'Neue Anfrage – Digital Solutions';
const MIN_SUBMIT_TIME = 3; // seconds
const RATE_LIMIT_SECONDS = 60;

$acceptsJson = (bool) preg_match('/application\/json/i', $_SERVER['HTTP_ACCEPT'] ?? '');
$requestedWith = strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '');
$expectsJson = $acceptsJson || $requestedWith === 'xmlhttprequest';

function ds_base_path(): string
{
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $directory = str_replace('\\', '/', dirname($scriptName));
    if ($directory === '\\' || $directory === '/') {
        return '/';
    }
    $directory = rtrim($directory, '/');
    if ($directory === '' || $directory === '.') {
        return '/';
    }
    return $directory . '/';
}

function ds_build_path(string $target = ''): string
{
    $basePath = ds_base_path();
    if ($target === '' || $target === '.') {
        return $basePath;
    }

    if (preg_match('#^(?:[a-z]+:)?//#i', $target) === 1) {
        return $target;
    }

    if ($target[0] === '#' || $target[0] === '/') {
        return $target;
    }

    return $basePath . ltrim($target, '/');
}

function ds_response(array $payload, int $status, bool $json): void
{
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($status);
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        http_response_code($status);
        $message = htmlspecialchars($payload['message'] ?? '', ENT_QUOTES, 'UTF-8');
        $contactPath = htmlspecialchars(ds_build_path('kontakt.html'), ENT_QUOTES, 'UTF-8');
        echo "<!DOCTYPE html><html lang=\"de\"><head><meta charset=\"utf-8\"><title>Kontakt</title><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body style=\"font-family:Arial,sans-serif;padding:2rem;\"><h1>Kontakt</h1><p>{$message}</p><p><a href=\"{$contactPath}\">Zurück zum Formular</a></p></body></html>";
    }
    exit;
}

function ds_log_write(string $line): void
{
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0750, true);
    }
    $logFile = sprintf('%s/kontakt-%s.log', $logDir, date('Ymd'));
    $created = !file_exists($logFile);
    file_put_contents($logFile, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    if ($created) {
        @chmod($logFile, 0640);
    }
}

function ds_log(string $message): void
{
    $line = sprintf('[%s] %s', date('c'), $message);
    ds_log_write($line);
}

function ds_log_submission(array $data): void
{
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        ds_log('JSON-Logging fehlgeschlagen: ' . json_last_error_msg());
        return;
    }
    ds_log_write($encoded);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ds_response(['ok' => false, 'message' => 'Method not allowed.'], 405, $expectsJson);
}

$input = filter_input_array(INPUT_POST, [
    'name' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'email' => FILTER_SANITIZE_EMAIL,
    'phone' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'company' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'budget' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'budget_range' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'message' => FILTER_UNSAFE_RAW,
    'consent' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'website' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'form_started_at' => FILTER_SANITIZE_NUMBER_FLOAT,
    'timeline' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'project_type' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'impact' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'stack' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'deadline' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'context' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'systemlandschaft' => FILTER_UNSAFE_RAW,
    'utm_source' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'utm_medium' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'utm_campaign' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'utm_term' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'utm_content' => FILTER_SANITIZE_FULL_SPECIAL_CHARS,
    'referrer' => FILTER_UNSAFE_RAW,
]);

if (!is_array($input)) {
    ds_response(['ok' => false, 'message' => 'Ungültige Eingabe.'], 400, $expectsJson);
}

$errors = [];

if (!empty($input['website'])) {
    ds_log('Honeypot ausgelöst von IP ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    ds_response(['ok' => true, 'message' => 'Danke.'], 200, $expectsJson);
}

$name = trim((string) ($input['name'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$phone = trim((string) ($input['phone'] ?? ''));
$company = trim((string) ($input['company'] ?? ''));
$budget = trim((string) ($input['budget'] ?? ''));
$budgetRange = trim((string) ($input['budget_range'] ?? ''));
$message = trim((string) ($input['message'] ?? ''));
$consent = isset($input['consent']);
$timeline = trim((string) ($input['timeline'] ?? ''));
$projectType = trim((string) ($input['project_type'] ?? ''));
$impact = trim((string) ($input['impact'] ?? ''));
$stack = trim((string) ($input['stack'] ?? ''));
$deadline = trim((string) ($input['deadline'] ?? ''));
$context = trim((string) ($input['context'] ?? 'page'));
$systemLandscape = trim((string) ($input['systemlandschaft'] ?? ''));
$utmSource = trim((string) ($input['utm_source'] ?? ''));
$utmMedium = trim((string) ($input['utm_medium'] ?? ''));
$utmCampaign = trim((string) ($input['utm_campaign'] ?? ''));
$utmTerm = trim((string) ($input['utm_term'] ?? ''));
$utmContent = trim((string) ($input['utm_content'] ?? ''));
$referrer = trim((string) ($input['referrer'] ?? ''));
$formStartedRaw = $input['form_started_at'] ?? '';
$startedAt = is_numeric($formStartedRaw) ? (float) $formStartedRaw : 0.0;
if ($startedAt > 1000000000000) { // assume milliseconds
    $startedAt /= 1000;
}

$now = microtime(true);
if ($startedAt <= 0) {
    // allow fallback submissions but enforce delay for repeated attempts
    $startedAt = $now - MIN_SUBMIT_TIME;
}

if (($now - $startedAt) < MIN_SUBMIT_TIME) {
    $errors['form'] = 'Formular zu schnell abgeschickt. Bitte erneut versuchen.';
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/ds_contact_' . md5($ip);
if (is_file($rateFile)) {
    $last = (int) file_get_contents($rateFile);
    if ($last > 0 && (time() - $last) < RATE_LIMIT_SECONDS) {
        $errors['form'] = 'Zu viele Anfragen. Bitte später erneut versuchen.';
    }
}

if ($name === '' || mb_strlen($name) < 2) {
    $errors['name'] = 'Bitte einen vollständigen Namen eingeben.';
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Bitte eine gültige E-Mail-Adresse verwenden.';
}

if ($message === '' || mb_strlen($message) < 20) {
    $errors['message'] = 'Bitte mindestens 20 Zeichen Projektbeschreibung angeben.';
}

if (!$consent) {
    $errors['consent'] = 'Bitte den Datenschutzhinweis bestätigen.';
}

if (!empty($errors)) {
    ds_log('Validierung fehlgeschlagen: ' . json_encode($errors, JSON_UNESCAPED_UNICODE) . ' IP: ' . $ip);
    ds_response(['ok' => false, 'errors' => $errors, 'message' => $errors['form'] ?? 'Validierung fehlgeschlagen.'], 422, $expectsJson);
}

file_put_contents($rateFile, (string) time(), LOCK_EX);

$lines = [
    'Quelle: ' . $context,
    'Name: ' . $name,
    'E-Mail: ' . $email,
    'Telefon: ' . ($phone !== '' ? $phone : '–'),
    'Firma: ' . ($company !== '' ? $company : '–'),
    'Budget (Legacy): ' . ($budget !== '' ? $budget : '–'),
    'Budget-Range: ' . ($budgetRange !== '' ? $budgetRange : '–'),
    'Timeline: ' . ($timeline !== '' ? $timeline : '–'),
    'Projektart: ' . ($projectType !== '' ? $projectType : '–'),
    'Impact-Ziel: ' . ($impact !== '' ? $impact : '–'),
    'Tech-Stack: ' . ($stack !== '' ? $stack : '–'),
    'Systemlandschaft: ' . ($systemLandscape !== '' ? $systemLandscape : '–'),
    'Go-Live Datum: ' . ($deadline !== '' ? $deadline : '–'),
    '',
    'Nachricht:',
    $message,
];

$utmDetails = array_filter([
    'utm_source' => $utmSource,
    'utm_medium' => $utmMedium,
    'utm_campaign' => $utmCampaign,
    'utm_term' => $utmTerm,
    'utm_content' => $utmContent,
], static fn($value) => $value !== '');

if (!empty($utmDetails) || $referrer !== '') {
    $lines[] = '';
    $lines[] = 'Tracking:';
    foreach ($utmDetails as $key => $value) {
        $lines[] = sprintf('%s: %s', $key, $value);
    }
    if ($referrer !== '') {
        $lines[] = 'Referrer: ' . $referrer;
    }
}

$body = implode("\n", $lines);
$headers = [
    'From: ' . CONTACT_TO,
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . PHP_VERSION,
    'Content-Type: text/plain; charset=UTF-8',
];

$sent = @mail(CONTACT_TO, CONTACT_SUBJECT, $body, implode("\r\n", $headers));

if (!$sent) {
    ds_log('Mailversand fehlgeschlagen für ' . $email);
    ds_response(['ok' => false, 'message' => 'Versand fehlgeschlagen. Bitte später erneut versuchen.'], 500, $expectsJson);
}

$logEntry = [
    'timestamp' => date('c'),
    'ip' => $ip,
    'status' => 'sent',
    'context' => $context,
    'name' => $name,
    'email' => $email,
    'phone' => $phone !== '' ? $phone : null,
    'company' => $company !== '' ? $company : null,
    'budget' => $budget !== '' ? $budget : null,
    'budget_range' => $budgetRange !== '' ? $budgetRange : null,
    'timeline' => $timeline !== '' ? $timeline : null,
    'project_type' => $projectType !== '' ? $projectType : null,
    'impact' => $impact !== '' ? $impact : null,
    'stack' => $stack !== '' ? $stack : null,
    'deadline' => $deadline !== '' ? $deadline : null,
    'systemlandschaft' => $systemLandscape !== '' ? $systemLandscape : null,
    'message' => $message,
];

if (!empty($utmDetails)) {
    $logEntry['utm'] = $utmDetails;
}

if ($referrer !== '') {
    $logEntry['referrer'] = $referrer;
}

ds_log_submission($logEntry);

$thankYouPath = ds_build_path('danke.html');

if ($expectsJson) {
    ds_response(['ok' => true, 'redirect' => $thankYouPath], 200, true);
}

header('Location: ' . $thankYouPath, true, 303);
header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Weiterleitung</title><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=' . htmlspecialchars($thankYouPath, ENT_QUOTES, 'UTF-8') . '"></head><body style="font-family:Arial,sans-serif;padding:2rem;"><p>Weiterleitung... <a href="' . htmlspecialchars($thankYouPath, ENT_QUOTES, 'UTF-8') . '">Zur Dankesseite</a></p></body></html>';
exit;
