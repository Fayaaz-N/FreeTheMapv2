<?php

// cors.php
$url = $_GET['url'] ?? '';
if (!$url) {
    http_response_code(400);
    exit('Missing url');
}

// (optioneel) whitelist om misbruik te voorkomen
$allowed = ['sassets.knvb.nl', 'assets.knvb.nl', 'onsoranje.nl'];
$host = parse_url($url, PHP_URL_HOST);
if (!in_array($host, $allowed, true)) {
    http_response_code(403);
    exit('Host not allowed');
}

header('Access-Control-Allow-Origin: *');

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_USERAGENT => 'Mozilla/5.0',
]);
$data = curl_exec($ch);
$ct = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/jpeg';
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code >= 400 || !$data) {
    http_response_code(502);
    exit('Fetch failed');
}

header('Content-Type: ' . $ct);
echo $data;
