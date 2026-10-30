extends Node2D

# Course.gd - Manages hole geometry, hazards (sand/water), interactive cup suction, and flags

signal ball_sunk()

@onready var cup_area: Area2D = $CupArea
@onready var flag_sprite: Sprite2D = $CupArea/Flag
@onready var bunker_area: Area2D = $BunkerArea
@onready var tee_marker: Marker2D = $TeeMarker
@onready var sink_particles: CPUParticles2D = $CupArea/SinkParticles

var current_ball: RigidBody2D = null

func _ready() -> void:
	cup_area.body_entered.connect(_on_cup_body_entered)
	bunker_area.body_entered.connect(_on_bunker_body_entered)
	bunker_area.body_exited.connect(_on_bunker_body_exited)
	sink_particles.emitting = false

func register_ball(ball: RigidBody2D) -> void:
	current_ball = ball
	current_ball.global_position = tee_marker.global_position

func _physics_process(_delta: float) -> void:
	if not is_instance_valid(current_ball) or current_ball.is_sunk:
		return

	var cup_pos = cup_area.global_position
	var dist = current_ball.global_position.distance_to(cup_pos)
	var assist_radius = GameManager.get_adaptive_cup_assist_radius()

	# Adaptive Cup Suction Funnel
	if dist < assist_radius:
		var pull_dir = (cup_pos - current_ball.global_position).normalized()
		var pull_strength = (1.0 - (dist / assist_radius)) * 140.0
		current_ball.apply_central_force(pull_dir * pull_strength)

		# Sinking condition: close and moving at putt speed
		if dist < 16.0 and current_ball.linear_velocity.length() < 160.0:
			_sink_ball()

func _sink_ball() -> void:
	if current_ball.is_sunk:
		return
	sink_particles.emitting = true
	current_ball.sink_in_hole(cup_area.global_position)
	emit_signal("ball_sunk")

func _on_cup_body_entered(body: Node2D) -> void:
	if body == current_ball and not current_ball.is_sunk:
		if current_ball.linear_velocity.length() < 180.0:
			_sink_ball()

func _on_bunker_body_entered(body: Node2D) -> void:
	if body == current_ball and current_ball.has_method("set_in_sand"):
		current_ball.set_in_sand(true)

func _on_bunker_body_exited(body: Node2D) -> void:
	if body == current_ball and current_ball.has_method("set_in_sand"):
		current_ball.set_in_sand(false)
