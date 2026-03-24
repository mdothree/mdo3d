<?php
/**
 * AJAX handlers for frontend interactions
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Draw random card via AJAX
 */
function divination_ajax_draw_card() {
    check_ajax_referer('divination_blocks_nonce', 'nonce');
    
    $card = Divination_Card_Database::get_random_card();
    
    wp_send_json_success($card);
}
add_action('wp_ajax_divination_draw_card', 'divination_ajax_draw_card');
add_action('wp_ajax_nopriv_divination_draw_card', 'divination_ajax_draw_card');

/**
 * Draw multiple cards via AJAX
 */
function divination_ajax_draw_spread() {
    check_ajax_referer('divination_blocks_nonce', 'nonce');
    
    $count = isset($_POST['count']) ? intval($_POST['count']) : 3;
    $cards = Divination_Card_Database::get_random_cards($count);
    
    wp_send_json_success($cards);
}
add_action('wp_ajax_divination_draw_spread', 'divination_ajax_draw_spread');
add_action('wp_ajax_nopriv_divination_draw_spread', 'divination_ajax_draw_spread');
