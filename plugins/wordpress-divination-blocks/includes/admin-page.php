<?php
/**
 * Admin settings page
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

$license_key = get_option('divination_blocks_license_key', '');
$is_licensed = Divination_License::is_valid();
$primary_color = get_option('divination_blocks_primary_color', '#8b5cf6');
$secondary_color = get_option('divination_blocks_secondary_color', '#ec4899');
?>

<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <div class="divination-admin-container">
        <div class="divination-admin-main">
            
            <!-- License Section -->
            <div class="card">
                <h2>🔮 License Activation</h2>
                
                <?php if ($is_licensed): ?>
                    <div class="notice notice-success inline">
                        <p>✅ <strong>License Active!</strong> All features unlocked.</p>
                    </div>
                <?php else: ?>
                    <div class="notice notice-warning inline">
                        <p>⚠️ <strong>Free Version</strong> - Some features limited. <a href="https://your-site.com/pricing" target="_blank">Get a license</a></p>
                    </div>
                <?php endif; ?>
                
                <form method="post" action="options.php">
                    <?php settings_fields('divination_blocks_settings'); ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="divination_blocks_license_key">License Key</label>
                            </th>
                            <td>
                                <input type="text" 
                                       id="divination_blocks_license_key" 
                                       name="divination_blocks_license_key" 
                                       value="<?php echo esc_attr($license_key); ?>" 
                                       class="regular-text" 
                                       placeholder="Enter your license key">
                                <p class="description">
                                    Enter your license key to unlock all features.
                                    <a href="https://your-site.com/account" target="_blank">Get a license →</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <?php submit_button('Activate License'); ?>
                </form>
            </div>
            
            <!-- Customization Section -->
            <div class="card" style="margin-top: 20px;">
                <h2>🎨 Customization</h2>
                
                <form method="post" action="options.php">
                    <?php settings_fields('divination_blocks_settings'); ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="divination_blocks_primary_color">Primary Color</label>
                            </th>
                            <td>
                                <input type="color" 
                                       id="divination_blocks_primary_color" 
                                       name="divination_blocks_primary_color" 
                                       value="<?php echo esc_attr($primary_color); ?>">
                                <p class="description">Main color for cards and blocks</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <label for="divination_blocks_secondary_color">Secondary Color</label>
                            </th>
                            <td>
                                <input type="color" 
                                       id="divination_blocks_secondary_color" 
                                       name="divination_blocks_secondary_color" 
                                       value="<?php echo esc_attr($secondary_color); ?>">
                                <p class="description">Accent color for highlights</p>
                            </td>
                        </tr>
                    </table>
                    
                    <?php submit_button('Save Colors'); ?>
                </form>
            </div>
            
            <!-- Available Blocks -->
            <div class="card" style="margin-top: 20px;">
                <h2>📦 Available Blocks</h2>
                
                <div class="divination-blocks-list">
                    <div class="divination-block-item">
                        <span class="dashicons dashicons-heart"></span>
                        <div>
                            <h3>Oracle Card</h3>
                            <p>Single daily oracle card reading with beautiful display</p>
                            <span class="badge">Free</span>
                        </div>
                    </div>
                    
                    <div class="divination-block-item">
                        <span class="dashicons dashicons-star-filled"></span>
                        <div>
                            <h3>Three-Card Spread</h3>
                            <p>Past, Present, Future reading layout</p>
                            <?php echo $is_licensed ? '<span class="badge badge-pro">Pro</span>' : '<span class="badge badge-locked">🔒 Locked</span>'; ?>
                        </div>
                    </div>
                    
                    <div class="divination-block-item">
                        <span class="dashicons dashicons-image-filter"></span>
                        <div>
                            <h3>Moon Phase</h3>
                            <p>Display current moon phase with spiritual guidance</p>
                            <span class="badge">Free</span>
                        </div>
                    </div>
                    
                    <div class="divination-block-item">
                        <span class="dashicons dashicons-format-quote"></span>
                        <div>
                            <h3>Daily Affirmation</h3>
                            <p>Rotating spiritual affirmations for your readers</p>
                            <span class="badge">Free</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Sidebar -->
        <div class="divination-admin-sidebar">
            
            <!-- Quick Stats -->
            <div class="card">
                <h3>📊 Stats</h3>
                <p><strong>Version:</strong> <?php echo DIVINATION_BLOCKS_VERSION; ?></p>
                <p><strong>Status:</strong> <?php echo $is_licensed ? '✅ Licensed' : '⚠️ Free'; ?></p>
                <p><strong>Blocks:</strong> 4 total</p>
            </div>
            
            <!-- Support -->
            <div class="card" style="margin-top: 20px;">
                <h3>💬 Support</h3>
                <p>Need help? We're here for you!</p>
                <a href="https://your-site.com/docs" target="_blank" class="button">📚 Documentation</a>
                <a href="https://your-site.com/support" target="_blank" class="button" style="margin-top: 10px;">💬 Get Support</a>
            </div>
            
            <!-- Upgrade -->
            <?php if (!$is_licensed): ?>
            <div class="card" style="margin-top: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <h3 style="color: white;">⭐ Upgrade to Pro</h3>
                <p>Unlock all features:</p>
                <ul style="margin-left: 20px; margin-bottom: 15px;">
                    <li>✅ 3-Card Spreads</li>
                    <li>✅ Celtic Cross</li>
                    <li>✅ Custom Colors</li>
                    <li>✅ Priority Support</li>
                    <li>✅ Lifetime Updates</li>
                </ul>
                <a href="https://your-site.com/pricing" target="_blank" class="button button-primary button-hero" style="width: 100%; text-align: center;">
                    Get Pro License →
                </a>
                <p style="margin-top: 10px; font-size: 12px; opacity: 0.9;">
                    30-day money-back guarantee
                </p>
            </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<style>
.divination-admin-container {
    display: flex;
    gap: 20px;
    margin-top: 20px;
}

.divination-admin-main {
    flex: 1;
}

.divination-admin-sidebar {
    width: 300px;
}

.divination-blocks-list {
    display: grid;
    gap: 15px;
}

.divination-block-item {
    display: flex;
    align-items: start;
    gap: 15px;
    padding: 15px;
    background: #f9f9f9;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
}

.divination-block-item .dashicons {
    font-size: 30px;
    width: 30px;
    height: 30px;
    color: #8b5cf6;
}

.divination-block-item h3 {
    margin: 0 0 5px 0;
    font-size: 16px;
}

.divination-block-item p {
    margin: 0 0 5px 0;
    color: #666;
    font-size: 13px;
}

.badge {
    display: inline-block;
    padding: 3px 8px;
    background: #10b981;
    color: white;
    font-size: 11px;
    border-radius: 3px;
    font-weight: 600;
}

.badge-pro {
    background: #8b5cf6;
}

.badge-locked {
    background: #6b7280;
}

@media (max-width: 1200px) {
    .divination-admin-container {
        flex-direction: column;
    }
    
    .divination-admin-sidebar {
        width: 100%;
    }
}
</style>
