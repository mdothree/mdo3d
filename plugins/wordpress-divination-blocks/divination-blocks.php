<?php
/**
 * Plugin Name: Divination Blocks
 * Plugin URI: https://your-site.com/divination-blocks
 * Description: Beautiful Gutenberg blocks for oracle cards, tarot, moon phases, and spiritual content
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://your-site.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: divination-blocks
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('DIVINATION_BLOCKS_VERSION', '1.0.0');
define('DIVINATION_BLOCKS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('DIVINATION_BLOCKS_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
class Divination_Blocks {
    
    /**
     * Instance of this class
     */
    private static $instance = null;
    
    /**
     * Get instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        add_action('init', array($this, 'register_blocks'));
        add_action('enqueue_block_editor_assets', array($this, 'enqueue_block_editor_assets'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Include required files
        $this->includes();
    }
    
    /**
     * Include required files
     */
    private function includes() {
        require_once DIVINATION_BLOCKS_PLUGIN_DIR . 'includes/card-database.php';
        require_once DIVINATION_BLOCKS_PLUGIN_DIR . 'includes/license.php';
        require_once DIVINATION_BLOCKS_PLUGIN_DIR . 'includes/ajax-handlers.php';
    }
    
    /**
     * Register all blocks
     */
    public function register_blocks() {
        // Oracle Card Block
        register_block_type(DIVINATION_BLOCKS_PLUGIN_DIR . 'blocks/oracle-card');
        
        // Three Card Spread Block
        register_block_type(DIVINATION_BLOCKS_PLUGIN_DIR . 'blocks/three-card');
        
        // Moon Phase Block
        register_block_type(DIVINATION_BLOCKS_PLUGIN_DIR . 'blocks/moon-phase');
        
        // Affirmation Block
        register_block_type(DIVINATION_BLOCKS_PLUGIN_DIR . 'blocks/affirmation');
    }
    
    /**
     * Enqueue block editor assets
     */
    public function enqueue_block_editor_assets() {
        wp_enqueue_script(
            'divination-blocks-editor',
            DIVINATION_BLOCKS_PLUGIN_URL . 'assets/js/blocks.js',
            array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n'),
            DIVINATION_BLOCKS_VERSION,
            true
        );
        
        wp_enqueue_style(
            'divination-blocks-editor',
            DIVINATION_BLOCKS_PLUGIN_URL . 'assets/css/blocks-editor.css',
            array('wp-edit-blocks'),
            DIVINATION_BLOCKS_VERSION
        );
        
        // Pass data to JavaScript
        wp_localize_script('divination-blocks-editor', 'divinationBlocks', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('divination_blocks_nonce'),
            'isLicensed' => Divination_License::is_valid()
        ));
    }
    
    /**
     * Enqueue frontend assets
     */
    public function enqueue_frontend_assets() {
        // Only load if blocks are present on page
        if (has_block('divination/oracle-card') || 
            has_block('divination/three-card') || 
            has_block('divination/moon-phase') || 
            has_block('divination/affirmation')) {
            
            wp_enqueue_style(
                'divination-blocks-frontend',
                DIVINATION_BLOCKS_PLUGIN_URL . 'assets/css/blocks-frontend.css',
                array(),
                DIVINATION_BLOCKS_VERSION
            );
            
            wp_enqueue_script(
                'divination-blocks-frontend',
                DIVINATION_BLOCKS_PLUGIN_URL . 'assets/js/frontend.js',
                array('jquery'),
                DIVINATION_BLOCKS_VERSION,
                true
            );
            
            wp_localize_script('divination-blocks-frontend', 'divinationBlocks', array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('divination_blocks_nonce')
            ));
        }
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('Divination Blocks', 'divination-blocks'),
            __('Divination Blocks', 'divination-blocks'),
            'manage_options',
            'divination-blocks',
            array($this, 'render_admin_page'),
            'dashicons-heart',
            30
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('divination_blocks_settings', 'divination_blocks_license_key');
        register_setting('divination_blocks_settings', 'divination_blocks_primary_color');
        register_setting('divination_blocks_settings', 'divination_blocks_secondary_color');
    }
    
    /**
     * Render admin page
     */
    public function render_admin_page() {
        require_once DIVINATION_BLOCKS_PLUGIN_DIR . 'includes/admin-page.php';
    }
}

/**
 * Initialize plugin
 */
function divination_blocks_init() {
    return Divination_Blocks::get_instance();
}

// Start the plugin
add_action('plugins_loaded', 'divination_blocks_init');
