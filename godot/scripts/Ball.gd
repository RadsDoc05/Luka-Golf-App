extends RigidBody2D

# Ball.gd - Real 2D Physics Golf Ball with Slingshot Aim, Spin, Trail & Sinking Animation

signal shot_released(power: float, is_mega: bool)
signal ball_stopped()

@export var max_power: float = 750.0
@export var min_drag_threshold: float = 15.0
@export var default_linear_damp: float = 1.75
@export var sand_linear_damp: float = 5.0

var is_aiming: bool = false
var drag_start_pos: Vector2 = Vector2.ZERO
var current_drag_pos: Vector2 = Vector2.ZERO
var was_moving: bool = false
var is_sunk: bool = false
var in_sand: bool = false
var initial_spawn_pos: Vector2 = Vector2.ZERO

@onready var visual_root: Node2D = $VisualRoot
@onready var shadow_sprite: Sprite2D = $VisualRoot/Shadow
@onready var ball_sprite: Sprite2D = $VisualRoot/BallSprite
@onready var aim_line: Line2D = $AimLine
@onready var trail_line: Line2D = $TrailLine
@onready var mega_particles: CPUParticles2D = $VisualRoot/MegaParticles
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

var max_trail_points: int = 24

func _ready() -> void:
	gravity_scale = 0.0
	linear_damp = default_linear_damp
	initial_spawn_pos = global_position
	aim_line.visible = false
	mega_particles.emitting = false

	# Connect to Mega Drive updates
	GameManager.mega_drive_status_changed.connect(_on_mega_drive_toggled)

func _physics_process(_delta: float) -> void:
	if is_sunk:
		return

	# Handle trail point recording
	if linear_velocity.length() > 20.0:
		trail_line.add_point(global_position)
		if trail_line.get_point_count() > max_trail_points:
			trail_line.remove_point(0)
		was_moving = true
	else:
		if trail_line.get_point_count() > 0:
			trail_line.remove_point(0)
		
		# Detect when ball has come to a complete stop
		if was_moving and linear_velocity.length() < 5.0:
			linear_velocity = Vector2.ZERO
			angular_velocity = 0.0
			was_moving = false
			emit_signal("ball_stopped")

	# Rotate ball sprite based on rolling velocity for tactile juice
	if linear_velocity.length() > 5.0:
		ball_sprite.rotation += linear_velocity.length() * 0.005

func _unhandled_input(event: InputEvent) -> void:
	if is_sunk or was_moving:
		return

	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				# Check if clicked near ball
				var dist_to_ball = global_position.distance_to(event.position)
				if dist_to_ball < 60.0:
					is_aiming = true
					drag_start_pos = event.position
					current_drag_pos = event.position
					aim_line.visible = true
					_update_aim_line()
			elif is_aiming:
				is_aiming = false
				aim_line.visible = false
				_release_shot()

	elif event is InputEventMouseMotion and is_aiming:
		current_drag_pos = event.position
		_update_aim_line()

func _update_aim_line() -> void:
	aim_line.clear_points()
	var pull_vec = drag_start_pos - current_drag_pos
	if pull_vec.length() < min_drag_threshold:
		return

	# Trajectory direction points opposite of drag (slingshot)
	var dir = pull_vec.normalized()
	var power_clamped = min(pull_vec.length() * 2.8, max_power)
	var line_length = (power_clamped / max_power) * 160.0

	aim_line.add_point(Vector2.ZERO)
	aim_line.add_point(dir * line_length)

	# Change aim line color depending on power & mega status
	if GameManager.is_mega_drive_active:
		aim_line.default_color = Color(1.0, 0.85, 0.1, 0.9)
	else:
		var ratio = power_clamped / max_power
		aim_line.default_color = Color(0.2 + ratio * 0.8, 1.0 - ratio * 0.5, 0.3, 0.85)

func _release_shot() -> void:
	var pull_vec = drag_start_pos - current_drag_pos
	if pull_vec.length() < min_drag_threshold:
		return

	var is_mega = GameManager.consume_mega_drive()
	var impulse_dir = pull_vec.normalized()
	var impulse_mag = min(pull_vec.length() * 3.2, max_power)

	if is_mega:
		impulse_mag *= 2.2 # Mega power boost!
		mega_particles.emitting = true
		# Screen shake & extra power juice
		_squash_and_stretch(1.4, 0.7)
	else:
		_squash_and_stretch(1.2, 0.85)

	apply_central_impulse(impulse_dir * impulse_mag)
	GameManager.record_stroke()
	emit_signal("shot_released", impulse_mag, is_mega)

func _squash_and_stretch(scale_x: float, scale_y: float) -> void:
	var tween = create_tween().set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(visual_root, "scale", Vector2(scale_x, scale_y), 0.08)
	tween.tween_property(visual_root, "scale", Vector2(1.0, 1.0), 0.15)

func _on_mega_drive_toggled(active: bool) -> void:
	mega_particles.emitting = active

func set_in_sand(sand_active: bool) -> void:
	in_sand = sand_active
	linear_damp = sand_linear_damp if sand_active else default_linear_damp

func sink_in_hole(cup_center: Vector2) -> void:
	if is_sunk:
		return
	is_sunk = true
	linear_velocity = Vector2.ZERO
	angular_velocity = 0.0
	collision_shape.set_deferred("disabled", true)

	var tween = create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.tween_property(self, "global_position", cup_center, 0.28)
	tween.tween_property(visual_root, "scale", Vector2(0.1, 0.1), 0.32)
	tween.tween_property(visual_root, "modulate:a", 0.0, 0.32)

	await tween.finished
	GameManager.notify_ball_sunk()

func reset_position(pos: Vector2) -> void:
	global_position = pos
	linear_velocity = Vector2.ZERO
	angular_velocity = 0.0
	is_sunk = false
	visual_root.scale = Vector2.ONE
	visual_root.modulate.a = 1.0
	collision_shape.set_deferred("disabled", false)
	trail_line.clear_points()
