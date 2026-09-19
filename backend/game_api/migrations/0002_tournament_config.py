import django.core.validators
from django.db import migrations, models

import game_api.models


def fill_join_codes(apps, schema_editor):
    """
    Give every tournament already in the database a code.

    The field is added nullable so existing rows survive the ALTER, filled here
    one row at a time — a callable default would be evaluated once and hand the
    same code to all of them, which a unique column refuses — and only then made
    NOT NULL.
    """
    Tournament = apps.get_model("game_api", "Tournament")
    alphabet = game_api.models.JOIN_CODE_ALPHABET
    length = game_api.models.JOIN_CODE_LENGTH
    import random

    taken = set(Tournament.objects.exclude(join_code=None).values_list("join_code", flat=True))
    for tournament in Tournament.objects.filter(join_code=None):
        while True:
            code = "".join(random.choices(alphabet, k=length))
            if code not in taken:
                break
        taken.add(code)
        tournament.join_code = code
        tournament.save(update_fields=["join_code"])


class Migration(migrations.Migration):

    dependencies = [("game_api", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="join_code",
            field=models.CharField(db_index=True, max_length=10, null=True, unique=True),
        ),
        migrations.RunPython(fill_join_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="tournament",
            name="join_code",
            field=models.CharField(
                db_index=True, default=game_api.models.generate_tournament_code, max_length=10, unique=True
            ),
        ),
        migrations.AddField(
            model_name="tournament",
            name="format",
            field=models.CharField(
                choices=[("knockout", "Knockout"), ("bestof", "Best of 3")], default="knockout", max_length=10
            ),
        ),
        migrations.AddField(
            model_name="tournament",
            name="players_per_table",
            field=models.PositiveSmallIntegerField(
                default=5,
                validators=[
                    django.core.validators.MinValueValidator(4),
                    django.core.validators.MaxValueValidator(7),
                ],
            ),
        ),
        migrations.AddField(
            model_name="tournament",
            name="advance_per_table",
            field=models.PositiveSmallIntegerField(
                default=2,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(3),
                ],
            ),
        ),
        migrations.AddField(
            model_name="tournament",
            name="starting_hand_size",
            field=models.PositiveSmallIntegerField(
                default=7,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(20),
                ],
            ),
        ),
        migrations.AddField(
            model_name="tournament",
            name="turn_timer_seconds",
            field=models.PositiveIntegerField(
                default=30,
                validators=[
                    django.core.validators.MinValueValidator(5),
                    django.core.validators.MaxValueValidator(300),
                ],
            ),
        ),
        migrations.AddField(
            model_name="tournament",
            name="final_best_of_3",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="tournament",
            name="matches_per_round",
            field=models.PositiveSmallIntegerField(default=3),
        ),
        migrations.AddField(
            model_name="tournament",
            name="matches_in_final",
            field=models.PositiveSmallIntegerField(default=5),
        ),
        migrations.AddField(
            model_name="tournament", name="draw_stacking", field=models.BooleanField(default=False)
        ),
        migrations.AddField(
            model_name="tournament", name="jump_in", field=models.BooleanField(default=False)
        ),
        migrations.AddField(
            model_name="tournament", name="draw_until_playable", field=models.BooleanField(default=False)
        ),
        migrations.AddField(
            model_name="tournament", name="seven_swap", field=models.BooleanField(default=False)
        ),
        migrations.AddField(
            model_name="tournament", name="zero_swap", field=models.BooleanField(default=False)
        ),
    ]
