<?php
$hashed = password_hash("Kayeganda22", PASSWORD_BCRYPT);
var_dump($hashed); // Note this hash
var_dump(password_verify("Kayeganda22", $hashed)); // Should return true IT DID
?>

