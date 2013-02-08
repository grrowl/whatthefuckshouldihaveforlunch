<?php
// proxies requests from whitelisted domains to the google places API for "bumps", so user-highlighted stores will show up more.

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
  header('Access-Control-Allow-Headers: Content-Type');
}
else
{
  die('{"error":"Origin not supported"}');
}

define('PROXY_TRUSTED', true);
define('PROXY_DESTINATION', 'https://maps.googleapis.com/maps/api/place/bump/json');

include "proxy.php";

?>