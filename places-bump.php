<?php
// proxies requests from whitelisted domains to the google places API for "bumps", so user-highlighted stores will show up more.

error_reporting(0);

$validOrigins = array(
  'http://localhost',
  'http://whatthefuckshouldihaveforlunch.local',
  'http://grrowl.github.com'
);

if (isset($_SERVER['HTTP_ORIGIN']) 
&& array_search($_SERVER['HTTP_ORIGIN'], $validOrigins) !== FALSE)
{
  header('Access-Control-Allow-Origin: '. $_SERVER['HTTP_ORIGIN']);
  header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
  header('Access-Control-Max-Age: '. (3600 * 1)); // 1 hour
  header('Access-Control-Allow-Headers: Content-Type, Content-Length');
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS')
  exit;

// GET variables
// - key
// - sensor

// POST variables:
// - placeReference

if (count($_GET))
  $querystring = '?'. http_build_query($_GET);
else
  $querystring = '';

define('PROXY_DESTINATION', 'https://maps.googleapis.com/maps/api/place/bump/json' . $querystring);

$postbody = file_get_contents("php://input");
// $postbody = '{"reference":"'. $_POST['place'] .'"}';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,            PROXY_DESTINATION);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST,           1);
curl_setopt($ch, CURLOPT_POSTFIELDS,     $postbody);
curl_setopt($ch, CURLOPT_HTTPHEADER,     array('Content-Type: application/json'));
$result = curl_exec($ch);

if ($error = curl_error($ch)) {
  echo '{"status":"PROXY_ERROR","message":"'. addcslashes($error, '"\\/') .'"}';

} else {
  // log to file if possible
  if (is_writable('bump.log') && function_exists('json_decode')) {
    $postobj = json_decode($postbody);
    $logentry = date(DATE_ATOM) .': ';
    if (is_object($postobj) && $postob['reference']) {
      $logentry .= $postobj['reference'];
    } else {
      $logentry .= str_replace(array("\r", "\n"), '', $postbody);
    }
    $logentry .= "\r\n";
    file_put_contents('bump.log', $logentry, FILE_APPEND | LOCK_EX);
  }

  echo $result;
}

?>