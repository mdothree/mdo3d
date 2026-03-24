<?php
/**
 * License validation
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Divination_License {
    
    /**
     * Check if license is valid
     */
    public static function is_valid() {
        $license_key = get_option('divination_blocks_license_key', '');
        
        if (empty($license_key)) {
            return false;
        }
        
        // For MVP: simple validation
        // In production: validate against your licensing server
        return self::validate_key($license_key);
    }
    
    /**
     * Validate license key
     */
    private static function validate_key($key) {
        // For MVP: Accept any non-empty key
        // In production: Check with licensing API
        
        // Example production code:
        // $response = wp_remote_post('https://your-site.com/api/validate', array(
        //     'body' => array(
        //         'license_key' => $key,
        //         'domain' => home_url()
        //     )
        // ));
        
        return !empty($key);
    }
    
    /**
     * Activate license
     */
    public static function activate($license_key) {
        // In production: Send to licensing server
        update_option('divination_blocks_license_key', sanitize_text_field($license_key));
        return true;
    }
    
    /**
     * Deactivate license
     */
    public static function deactivate() {
        delete_option('divination_blocks_license_key');
        return true;
    }
}
